import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Search,
  Menu,
  Moon,
  CheckCircle,
  Settings,
  Home as HomeIcon,
  User,
  X,
  Flag,
  Trash2,
  Check,
  LogOut,
  Archive,
} from 'react-feather'
import supabase,{
  getCurrentUser,
  signOut,
  searchUsers,
  sendContactRequest,
  acceptContactRequest,
  getPendingContactRequests,
  getSentContactRequests,
  getUserChats,
  getChatMessages,
  deleteChatForUser,
  archiveChat,
  unarchiveChat,
} from '../services/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [chats, setChats] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [requestSearch, setRequestSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [outgoingRequests, setOutgoingRequests] = useState([])
  const [archivedChats, setArchivedChats] = useState([])
  const [activeTab, setActiveTab] = useState('chats')
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionModeActive, setActionModeActive] = useState(false)
  const [selectedChatIds, setSelectedChatIds] = useState(new Set())
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const longPressTimer = useRef(null)

  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 2000)
  }

  const formatTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const formatDateLabel = (value) => {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const buildChatList = async (memberships, userId) => {
    if (!memberships || memberships.length === 0) {
      return []
    }

    const chatIds = memberships.map(m => m.chat_id)

    const { data: allMembers, error: memberError } = await supabase
      .from('chat_members')
      .select('chat_id, user_id')
      .in('chat_id', chatIds)

    if (memberError) throw memberError

    const memberUserIds = [...new Set((allMembers || []).map(member => member.user_id).filter(Boolean))]
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar')
      .in('id', memberUserIds)

    if (profileError) throw profileError

    const profileMap = new Map((profileRows || []).map(profile => [profile.id, profile]))

    const { data: allMessages, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false })

    if (messageError) throw messageError

    const lastByChat = new Map()
    allMessages?.forEach(msg => {
      if (!lastByChat.has(msg.chat_id)) {
        lastByChat.set(msg.chat_id, msg)
      }
    })

    const membersByChat = new Map()
    allMembers?.forEach(member => {
      const list = membersByChat.get(member.chat_id) || []
      list.push({
        ...member,
        profiles: profileMap.get(member.user_id) || null,
      })
      membersByChat.set(member.chat_id, list)
    })

    return Promise.all(
      memberships.map(async (membership) => {
        const chatId = membership.chat_id
        const chatMembers = membersByChat.get(chatId) || []
        const peer = chatMembers.find(m => m.user_id !== userId)?.profiles
        const lastMsg = lastByChat.get(chatId)

        return {
          id: chatId,
          name: peer?.full_name || peer?.username || 'Unknown',
          avatar: peer?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(peer?.full_name || 'User')}`,
          lastMsg: lastMsg?.message || 'No messages yet',
          time: lastMsg ? formatTime(lastMsg.created_at) : formatDateLabel(membership.chats?.created_at),
          unread: false,
          pinned: false,
          contactId: peer?.id || null,
          username: peer?.username || '',
        }
      })
    )
  }

  // Load user's chats
  const loadChats = useCallback(async (userId) => {
    try {
      const { data: archivedRows, error: archivedError } = await supabase
        .from('chat_archives')
        .select('chat_id')
        .eq('user_id', userId)

      if (archivedError) throw archivedError

      const archivedChatIds = new Set((archivedRows || []).map(item => item.chat_id))

      const { data: memberships, error: membershipError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          chats (
            id,
            created_at,
            last_message,
            last_sender_id,
            last_message_at
          )
        `)
        .eq('user_id', userId)

      if (membershipError) throw membershipError

      if (!memberships || memberships.length === 0) {
        setChats([])
        return
      }

      const visibleMemberships = (memberships || []).filter(m => !archivedChatIds.has(m.chat_id))

      const loadedChats = await buildChatList(visibleMemberships, userId)
      setChats(loadedChats)
    } catch (err) {
      console.error('Load chats error:', err)
      showToast('Failed to load chats', true)
    }
  }, [])

  const loadArchivedChats = useCallback(async (userId) => {
    try {
      const { data: archiveRows, error: archiveError } = await supabase
        .from('chat_archives')
        .select('chat_id, chats (id, created_at)')
        .eq('user_id', userId)

      if (archiveError) throw archiveError

      const archivedChatIds = (archiveRows || []).map(row => row.chat_id).filter(Boolean)
      if (archivedChatIds.length === 0) {
        setArchivedChats([])
        return
      }

      const { data: memberships, error: membershipError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          chats (
            id,
            created_at,
            last_message,
            last_sender_id,
            last_message_at
          )
        `)
        .in('chat_id', archivedChatIds)
        .eq('user_id', userId)

      if (membershipError) throw membershipError

      const loadedArchivedChats = await buildChatList(memberships || [], userId)
      setArchivedChats(loadedArchivedChats)
    } catch (err) {
      console.error('Load archived chats error:', err)
      showToast('Failed to load archived chats', true)
    }
  }, [])

  const loadPendingRequests = useCallback(async (userId) => {
    try {
      const [incoming, outgoing] = await Promise.all([
        getPendingContactRequests(userId),
        getSentContactRequests(userId),
      ])

      setIncomingRequests(incoming)
      setOutgoingRequests(outgoing)
    } catch (err) {
      console.error('Load pending requests error:', err)
      showToast('Failed to load requests', true)
    }
  }, [])

  // Search users for requests
  const handleSearchUsers = useCallback(async (term) => {
    if (!term.trim() || !currentUser) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchUsers(term, currentUser.id)
      setSearchResults(results)
    } catch (err) {
      console.error('Search error:', err)
      showToast('Failed to search users', true)
    }
  }, [currentUser])

  // Send contact request
  const sendRequest = async (recipientId, recipientName) => {
    if (!currentUser) return

    try {
      await sendContactRequest(currentUser.id, recipientId)
      showToast(`Request sent to ${recipientName}`)
      setSearchResults(prev => prev.filter(u => u.id !== recipientId))
    } catch (err) {
      console.error('Request error:', err)
      showToast(err.message || 'Failed to send request', true)
    }
  }

  const handleAcceptRequest = async (requestId, senderId) => {
    if (!currentUser) return

    try {
      const { success, chat, error } = await acceptContactRequest(requestId, currentUser.id, senderId)

      if (!success || error) throw error || new Error('Failed to accept request')

      setIncomingRequests(prev => prev.filter(request => request.id !== requestId))
      await loadChats(currentUser.id)
      navigate(`/chat/${chat.id}`)
      showToast('Request accepted')
    } catch (err) {
      console.error('Accept request error:', err)
      showToast(err.message || 'Failed to accept request', true)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Logout error:', err)
      showToast('Failed to logout', true)
    }
  }

  // Action mode functions
  const enterActionMode = (chatId) => {
    setActionModeActive(true)
    setSelectedChatIds(new Set([chatId]))
  }

  const exitActionMode = () => {
    setActionModeActive(false)
    setSelectedChatIds(new Set())
  }

  const toggleChatSelection = (chatId) => {
    setSelectedChatIds(prev => {
      const next = new Set(prev)
      if (next.has(chatId)) next.delete(chatId)
      else next.add(chatId)
      return next
    })
  }

  const handleChatClick = (chatId) => {
    if (actionModeActive) {
      toggleChatSelection(chatId)
      if (selectedChatIds.size === 1 && selectedChatIds.has(chatId)) {
        exitActionMode()
      }
      return
    }
    navigate(`/chat/${chatId}`)
  }

  const handleChatPointerDown = (chatId) => {
    longPressTimer.current = setTimeout(() => {
      enterActionMode(chatId)
    }, 500)
  }

  const handleDeleteSelectedChats = async () => {
    if (!currentUser || selectedChatIds.size === 0) return

    try {
      await Promise.all(
        Array.from(selectedChatIds).map(chatId => deleteChatForUser(chatId, currentUser.id))
      )
      await loadChats(currentUser.id)
      exitActionMode()
      showToast('Selected chats deleted')
    } catch (err) {
      console.error('Delete selected chats error:', err)
      showToast('Failed to delete selected chats', true)
    }
  }

  const handleArchiveSelectedChats = async () => {
    if (!currentUser || selectedChatIds.size === 0) return

    try {
      await Promise.all(
        Array.from(selectedChatIds).map(chatId => archiveChat(chatId, currentUser.id))
      )
      await Promise.all([
        loadChats(currentUser.id),
        loadArchivedChats(currentUser.id),
      ])
      exitActionMode()
      showToast('Selected chats archived')
    } catch (err) {
      console.error('Archive selected chats error:', err)
      showToast('Failed to archive selected chats', true)
    }
  }

  const handleUnarchiveChat = async (chatId) => {
    if (!currentUser) return

    try {
      await unarchiveChat(chatId, currentUser.id)
      await Promise.all([
        loadChats(currentUser.id),
        loadArchivedChats(currentUser.id),
      ])
      showToast('Chat moved back to your chats')
    } catch (err) {
      console.error('Unarchive chat error:', err)
      showToast('Failed to remove chat from archive', true)
    }
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUser(user)
      await Promise.all([
        loadChats(user.id),
        loadArchivedChats(user.id),
        loadPendingRequests(user.id),
      ])
      setLoading(false)
    }
    init()

    return () => {
      cancelLongPress()
    }
  }, [navigate, loadChats, loadArchivedChats, loadPendingRequests])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'requests') {
        handleSearchUsers(requestSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [requestSearch, activeTab, handleSearchUsers])

  // Filter chats based on search
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCount = selectedChatIds.size

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <div className="h-8 w-40 animate-pulse rounded-full bg-white/8" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-white/8" />
          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl bg-[#141414]/80 p-3">
                <div className="h-12 w-12 animate-pulse rounded-full bg-white/8" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/8" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 px-5 py-3 flex items-center justify-between bg-[#0a0a0a]/75 backdrop-blur-lg border-b border-white/5">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2"
        >
          <div className="bg-[#252525] p-1.5 rounded-xl">
            <MessageCircle size={20} />
          </div>
          <span className="text-xl font-semibold">Hash<span className="text-gray-400">.</span></span>
        </button>

        <div className="flex-1 max-w-[200px] md:max-w-xs mx-3">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 top-1/2 mt-2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-[#1c1c1e] border border-[#2e2e32] rounded-xl py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#6b6b70] placeholder:text-gray-500 align-middle"
            />
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl hover:bg-white/5 transition"
          >
            <Menu size={20} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 w-48 p-1 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    showToast('Mark all as read coming soon')
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3"
                >
                  <CheckCircle size={16} /> Read All
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/settings')
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3"
                >
                  <Settings size={16} /> Settings
                </button>
                <hr className="my-1 border-white/10" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="pt-20" />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pb-24">
        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('chats')}
            className={`text-base font-medium pb-1 transition ${
              activeTab === 'chats'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-500'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative text-base font-medium pb-1 transition ${
              activeTab === 'requests'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-500'
            }`}
          >
            Requests
            {incomingRequests.length > 0 && (
              <span className="absolute -top-2 -right-8 inline-flex min-w-6 min-h-4 items-center justify-center rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold text-black shadow-lg">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`text-base font-medium pb-1 transition ${
              activeTab === 'archives'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-500'
            }`}
          >
            Archives
          </button>
        </div>

        {/* Chats Tab */}
        {activeTab === 'chats' && (
          <div className="space-y-3">
            {filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <div
                  key={chat.id}
                  onMouseDown={() => handleChatPointerDown(chat.id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => handleChatPointerDown(chat.id)}
                  onTouchEnd={cancelLongPress}
                  onClick={() => handleChatClick(chat.id)}
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-all rounded-2xl ${
                    selectedChatIds.has(chat.id)
                      ? 'ring-2 ring-white/30 bg-white/10'
                      : 'bg-[#141414]/80 hover:bg-[#1a1a1a] border border-white/5'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(chat.name)}`
                      }}
                    />
                    {chat.unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-[#0a0a0a]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm truncate">
                        {chat.name} {chat.pinned && '📌'}
                      </h3>
                      <span className="text-[10px] text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{chat.lastMsg}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No chats yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Go to Requests tab to find people to chat with
                </p>
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div>
            {/* Search Bar */}
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-3">
              <label className="text-xs uppercase tracking-wider text-gray-400">
                Find people
              </label>
              <input
                type="text"
                placeholder="Search by name, email or username"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="mt-2 w-full bg-[#1c1c1e] border border-[#2e2e32] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#6b6b70] placeholder:text-gray-500"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Search existing users and start a chat request instantly
              </p>
            </div>

            {/* Pending Requests Lists */}
            <div className="mb-6 space-y-6">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Pending requests</h3>
                  <span className="text-[11px] text-gray-400">Received</span>
                </div>
                {incomingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {incomingRequests.map((request) => {
                      const sender = request.sender || null
                      return (
                        <article key={request.id} className="flex items-center gap-3 rounded-2xl bg-[#141414]/80 border border-white/5 p-3">
                          <img
                            src={sender?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(sender?.full_name || sender?.username || 'User')}`}
                            alt={sender?.full_name || sender?.username || 'User'}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{sender?.full_name || sender?.username || 'Unknown user'}</p>
                            <p className="truncate text-[11px] text-gray-400">@{sender?.username || 'unknown'} · {sender?.email || ''}</p>
                          </div>
                          <button
                            onClick={() => handleAcceptRequest(request.id, request.sender_id)}
                            className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25 transition"
                          >
                            Accept
                          </button>
                          <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-amber-300">Pending</span>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No pending requests received yet.</p>
                )}
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Requests you sent</h3>
                  <span className="text-[11px] text-gray-400">Outgoing</span>
                </div>
                {outgoingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {outgoingRequests.map((request) => {
                      const recipient = request.recipient || null
                      return (
                        <article key={request.id} className="flex items-center gap-3 rounded-2xl bg-[#141414]/80 border border-white/5 p-3">
                          <img
                            src={recipient?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(recipient?.full_name || recipient?.username || 'User')}`}
                            alt={recipient?.full_name || recipient?.username || 'User'}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{recipient?.full_name || recipient?.username || 'Unknown user'}</p>
                            <p className="truncate text-[11px] text-gray-400">@{recipient?.username || 'unknown'} · {recipient?.email || ''}</p>
                          </div>
                          <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-sky-300">Sent</span>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">You have not sent any pending requests yet.</p>
                )}
              </section>
            </div>

            {/* Search Results */}
            {requestSearch.trim() && (
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-medium text-gray-400">Search Results</h3>
                {searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <div
                      key={user.id}
                      className="p-3 flex items-center gap-3 rounded-2xl bg-[#141414]/80 border border-white/5"
                    >
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(user.full_name || user.username)}`}
                        alt={user.full_name}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">
                          {user.full_name || user.username}
                        </h3>
                        <p className="text-[11px] text-gray-400 truncate">
                          @{user.username} · {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => sendRequest(user.id, user.full_name || user.username)}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20 transition"
                      >
                        Send Request
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No users found for "{requestSearch}"
                  </p>
                )}
              </div>
            )}

            {/* Existing Chats (for quick access) */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400">Your Conversations</h3>
              {chats.length > 0 ? (
                chats.slice(0, 5).map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className="p-3 flex items-center gap-3 cursor-pointer rounded-2xl bg-[#141414]/80 border border-white/5 hover:bg-[#1a1a1a] transition"
                  >
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{chat.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{chat.lastMsg}</p>
                    </div>
                    <button className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20 transition">
                      Open
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No conversations yet
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'archives' && (
          <div className="space-y-3">
            {archivedChats.length > 0 ? (
              archivedChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className="p-3 flex items-center gap-3 cursor-pointer rounded-2xl bg-[#141414]/80 border border-white/5 hover:bg-[#1a1a1a] transition"
                >
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{chat.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{chat.lastMsg}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleUnarchiveChat(chat.id)
                    }}
                    className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-wide text-gray-200 transition hover:bg-white/20"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
                No archived chats yet.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Action Mode Header */}
      <div
        className={`fixed top-0 w-full z-50 py-3 px-5 flex items-center justify-between bg-[#141414] border-b border-white/10 transform transition-transform duration-300 ${
          actionModeActive ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={exitActionMode}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X size={20} />
          </button>
          <span className="text-sm font-medium">{selectedCount} selected</span>
        </div>
        <div className="flex gap-4">
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
            <Flag size={18} />
            <span className="text-[9px]">Pin</span>
          </button>
          <button
            onClick={handleDeleteSelectedChats}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-400 transition"
          >
            <Trash2 size={18} />
            <span className="text-[9px]">Delete</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
            <Check size={18} />
            <span className="text-[9px]">Mark read</span>
          </button>
          <button
            onClick={handleArchiveSelectedChats}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition"
          >
            <Archive size={18} />
            <span className="text-[9px]">Archive</span>
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm animate-fade-in-up ${
            toast.isError ? 'bg-red-500' : 'bg-emerald-500'
          } text-white`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}