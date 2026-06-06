import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  MoreVertical,
  Trash2,
  Slash,
  Search,
  Paperclip,
  Smile,
  Send,
  Image as ImageIcon,
  Video,
  File,
  CornerUpLeft,
  Copy,
  Check,
  Users,
  X,
  Download,
  FileText,
  Music,
  Edit2,
  Save,
  ArrowDown,
  Loader,
} from 'react-feather'
import supabase, {
  getCurrentUser,
  getChatDetails,
  getChatMessages,
  sendMessage,
  sendMediaMessage,
  deleteMessage,
  editMessage,
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToTypingStatus,
  updateTypingStatus,
  uploadChatMedia,
  clearChatMessages,
  blockUser,
  getBlockRelationship,
  unblockUser,
  deleteChatForUser,
  subscribeToReadReceipts,
} from '../services/supabase'

// Cache for images to prevent reloading
const imageCache = new Map()

export default function Chat() {
  const navigate = useNavigate()
  const { chatId } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [contact, setContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [contactTyping, setContactTyping] = useState(false)
  const [contactStatus, setContactStatus] = useState('online')
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  
  // Edit message states
  const [editingMessage, setEditingMessage] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyToMessage, setReplyToMessage] = useState(null)
  
  // File upload states
  const [pendingFiles, setPendingFiles] = useState([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [sendingFiles, setSendingFiles] = useState(new Map())
  
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false)
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [blockState, setBlockState] = useState({ blockedByMe: false, blockedByThem: false })
  const [imagesLoaded, setImagesLoaded] = useState(new Map())
  
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const inputRef = useRef(null)
  const subscriptionRef = useRef(null)
  const typingSubscriptionRef = useRef(null)
  const readReceiptSubscriptionRef = useRef(null)
  const socketRef = useRef(null)
  const processedMessageIds = useRef(new Set())
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // Load images from cache or localStorage
  const loadImageFromCache = useCallback((url) => {
    if (imageCache.has(url)) {
      return Promise.resolve(imageCache.get(url))
    }
    
    const cached = localStorage.getItem(`img_${btoa(url)}`)
    if (cached) {
      imageCache.set(url, cached)
      return Promise.resolve(cached)
    }
    
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        imageCache.set(url, url)
        localStorage.setItem(`img_${btoa(url)}`, url)
        resolve(url)
      }
      img.onerror = () => resolve(url)
      img.src = url
    })
  }, [])

  const mergeUniqueMessages = useCallback((existingMessages = [], incomingMessages = []) => {
    const messageMap = new Map()
    existingMessages.forEach(msg => { if (msg?.id) messageMap.set(msg.id, msg) })
    incomingMessages.forEach(msg => { if (msg?.id) messageMap.set(msg.id, msg) })
    return Array.from(messageMap.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollToBottom(false)
  }, [])

  const handleChatScroll = useCallback((event) => {
    const container = event.currentTarget
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
    setShowScrollToBottom(!nearBottom)
  }, [])

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const showToast = (message, isError = false) => {
    const toast = document.createElement('div')
    toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs backdrop-blur-md border animate-fade-in-up ${
      isError ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#252525] text-white border-white/10'
    }`
    toast.innerText = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2000)
  }

  // Send files in background
  const sendFileInBackground = async (pendingFile) => {
    const tempId = `temp-${Date.now()}-${pendingFile.id}`
    
    // Add optimistic message with loading state
    const optimisticMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUser.id,
      message: pendingFile.caption || '',
      media_url: pendingFile.preview || '/placeholder-image.svg',
      media_type: pendingFile.type,
      media_name: pendingFile.file.name,
      media_size: pendingFile.file.size,
      caption: pendingFile.caption,
      is_sending: true,
      upload_progress: 0,
      created_at: new Date().toISOString(),
      is_read: true,
    }
    
    setMessages(prev => mergeUniqueMessages(prev, [optimisticMessage]))
    setSendingFiles(prev => new Map(prev).set(tempId, { file: pendingFile, tempId }))
    scrollToBottom()
    
    try {
      for (let progress = 0; progress <= 90; progress += 10) {
        await new Promise(r => setTimeout(r, 50))
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, upload_progress: progress } : msg
        ))
      }
      
      const result = await uploadChatMedia(chatId, currentUser.id, pendingFile.file, pendingFile.type)
      
      if (result) {
        const sentMessage = await sendMediaMessage(chatId, currentUser.id, result, pendingFile.type, pendingFile.caption)
        setMessages(prev => mergeUniqueMessages(
          prev.filter(msg => msg.id !== tempId),
          [sentMessage]
        ))
        setSendingFiles(prev => {
          const next = new Map(prev)
          next.delete(tempId)
          return next
        })
      }
    } catch (err) {
      console.error('Error sending file:', err)
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      showToast(`Failed to send ${pendingFile.file.name}`, true)
      setSendingFiles(prev => {
        const next = new Map(prev)
        next.delete(tempId)
        return next
      })
    }
  }

  const handleFileSelect = (e, type) => {
    const files = Array.from(e.target.files)
    const newFiles = files.map(file => ({
      file,
      type,
      preview: type === 'image' ? URL.createObjectURL(file) : null,
      caption: '',
      id: Date.now() + Math.random(),
    }))
    setPendingFiles(prev => [...prev, ...newFiles])
    if (newFiles.length > 0) setShowPreviewModal(true)
    setAttachMenuOpen(false)
  }

  const removePendingFile = (fileId) => {
    setPendingFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter(f => f.id !== fileId)
    })
  }

  const updateCaption = (fileId, caption) => {
    setPendingFiles(prev => prev.map(f => f.id === fileId ? { ...f, caption } : f))
  }

  const sendAllPendingFiles = async () => {
    if (pendingFiles.length === 0 || !chatId || !currentUser) return
    
    const filesToSend = [...pendingFiles]
    setPendingFiles([])
    setShowPreviewModal(false)
    
    for (const file of filesToSend) {
      await sendFileInBackground(file)
      if (file.preview) URL.revokeObjectURL(file.preview)
    }
  }

  const loadChat = useCallback(async () => {
    if (!chatId || !currentUser) return
    try {
      setLoading(true)
      const chatDetails = await getChatDetails(chatId, currentUser.id)
      if (chatDetails) {
        setContact(chatDetails.contact)
        document.title = `Hash · Chat | ${chatDetails.contact?.full_name || chatDetails.contact?.username || 'Chat'}`
      }
      const loadedMessages = await getChatMessages(chatId)
      
      // Pre-load images
      loadedMessages.forEach(msg => {
        if (msg.media_type === 'image' && msg.media_url) {
          loadImageFromCache(msg.media_url)
        }
      })
      
      setMessages(prev => mergeUniqueMessages(prev, loadedMessages))
      scrollToBottom()
      
      const unreadMessages = loadedMessages.filter(msg => msg.sender_id !== currentUser.id && !msg.is_read)
      if (unreadMessages.length > 0) {
        await markMessagesAsRead(chatId, currentUser.id)
        setMessages(prev => prev.map(msg =>
          unreadMessages.some(unread => unread.id === msg.id) ? { ...msg, is_read: true, is_delivered: true } : msg
        ))
      }
    } catch (err) {
      console.error('Load chat error:', err)
      showToast('Failed to load chat', true)
    } finally {
      setLoading(false)
    }
  }, [chatId, currentUser, mergeUniqueMessages, scrollToBottom, loadImageFromCache])

  const setupRealtimeSubscription = useCallback(() => {
    if (!chatId) return
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe()

    subscriptionRef.current = subscribeToMessages(chatId, (payload) => {
      const messageId = payload.new?.id || payload.old?.id
      if (messageId && processedMessageIds.current.has(messageId)) return

      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new
        if (messageId) processedMessageIds.current.add(messageId)
        setMessages(prev => mergeUniqueMessages(prev, [newMsg]))
        scrollToBottom()
        if (newMsg.sender_id !== currentUser?.id) {
          markMessagesAsRead(chatId, currentUser?.id)
          setMessages(prev => prev.map(msg =>
            msg.id === newMsg.id ? { ...msg, is_read: true, is_delivered: true } : msg
          ))
        }
        if (messageId) {
          setTimeout(() => processedMessageIds.current.delete(messageId), 1000)
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedMsg = payload.new
        setMessages(prev => mergeUniqueMessages(
          prev.map(msg => (msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg)),
          []
        ))
      } else if (payload.eventType === 'DELETE') {
        setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
      }
    })

    return () => subscriptionRef.current?.unsubscribe()
  }, [chatId, currentUser, mergeUniqueMessages, scrollToBottom])

  const handleTyping = async () => {
    if (!currentUser || !chatId) return
    if (!isTyping) {
      setIsTyping(true)
      await updateTypingStatus(chatId, currentUser.id, true)
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false)
      await updateTypingStatus(chatId, currentUser.id, false)
    }, 2000)
  }

  const handleSendMessage = async () => {
    const text = newMessage.trim()
    if ((!text && pendingFiles.length === 0) || sending || !chatId || !currentUser) return

    if (pendingFiles.length > 0) {
      await sendAllPendingFiles()
    }

    if (text) {
      setSending(true)
      const optimisticId = `temp-${Date.now()}`
      const optimisticMessage = {
        id: optimisticId,
        chat_id: chatId,
        sender_id: currentUser.id,
        message: text,
        reply_to_id: replyToMessage?.id || null,
        created_at: new Date().toISOString(),
        is_read: true,
        is_sending: true,
      }
      setMessages(prev => mergeUniqueMessages(prev, [optimisticMessage]))
      setNewMessage('')
      scrollToBottom()

      try {
        const sentMessage = await sendMessage(chatId, currentUser.id, text, replyToMessage?.id || null)
        setMessages(prev => mergeUniqueMessages(prev.filter(msg => msg.id !== optimisticId), [sentMessage]))
        setReplyToMessage(null)
        if (isTyping) {
          setIsTyping(false)
          await updateTypingStatus(chatId, currentUser.id, false)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        }
      } catch (err) {
        console.error('Send message error:', err)
        setMessages(prev => prev.filter(msg => msg.id !== optimisticId))
        showToast('Failed to send message', true)
      } finally {
        setSending(false)
      }
    }
  }

  const handleStartEdit = (message) => {
    if (message.sender_id !== currentUser?.id) {
      showToast('You can only edit your own messages', true)
      return
    }
    setEditingMessage(message)
    setEditText(message.message)
    setActionSheetOpen(false)
    setSelectedMessage(null)
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMessage) return
    try {
      const updatedMessage = await editMessage(editingMessage.id, editText.trim())
      setMessages(prev => prev.map(msg =>
        msg.id === editingMessage.id
          ? { ...msg, message: updatedMessage.message, edited: true, updated_at: updatedMessage.updated_at }
          : msg
      ))
      setEditingMessage(null)
      setEditText('')
      showToast('Message edited')
    } catch (err) {
      console.error('Edit error:', err)
      showToast('Failed to edit message', true)
    }
  }

  const cancelEdit = () => {
    setEditingMessage(null)
    setEditText('')
  }

  const handleDeleteMessage = async (messageId, deleteForAll = false) => {
    try {
      await deleteMessage(messageId, currentUser.id, deleteForAll)
      if (deleteForAll) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId))
      } else {
        setMessages(prev => prev.map(msg => msg.id === messageId
          ? {
              ...msg,
              message: 'Message deleted',
              deleted: true,
              media_url: null,
              media_type: null,
              media_name: null,
              media_size: null,
              caption: null,
              edited: false,
            }
          : msg
        ))
      }
      showToast('Message deleted')
      setActionSheetOpen(false)
      setSelectedMessage(null)
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Failed to delete message', true)
    }
  }

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard')
    setActionSheetOpen(false)
    setSelectedMessage(null)
  }

  const getMediaItems = () => messages.filter(msg => msg.media_url && ['image', 'video'].includes(msg.media_type))

  const openMediaViewer = (message) => {
    const items = getMediaItems()
    const index = items.findIndex(item => item.id === message.id)
    if (index >= 0) {
      setMediaViewerIndex(index)
      setMediaViewerOpen(true)
    }
  }

  const closeMediaViewer = () => {
    setMediaViewerOpen(false)
    setTouchStartX(null)
  }

  const showPreviousMedia = () => {
    const items = getMediaItems()
    if (!items.length) return
    setMediaViewerIndex((prev) => (prev - 1 + items.length) % items.length)
  }

  const showNextMedia = () => {
    const items = getMediaItems()
    if (!items.length) return
    setMediaViewerIndex((prev) => (prev + 1) % items.length)
  }

  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStartX === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX
    if (deltaX > 70) showPreviousMedia()
    if (deltaX < -70) showNextMedia()
    setTouchStartX(null)
  }

  const handleDownloadMedia = async (url, fileName) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
      showToast('Download started')
    } catch (err) {
      console.error('Download error:', err)
      showToast('Failed to download', true)
    }
  }

  const handleClearChat = async () => {
    if (!chatId) return
    try {
      await clearChatMessages(chatId)
      setMessages([])
      showToast('Chat cleared')
      closeConfirmModal()
    } catch (err) {
      console.error('Clear chat error:', err)
      showToast('Failed to clear chat', true)
    }
  }

  const handleBlockUser = async () => {
    if (!contact?.id || !currentUser?.id) return
    try {
      await blockUser(currentUser.id, contact.id)
      setBlockState(prev => ({ ...prev, blockedByMe: true, blockedByThem: false }))
      showToast('User blocked successfully')
      closeConfirmModal()
    } catch (err) {
      console.error('Block user error:', err)
      showToast('Failed to block user', true)
    }
  }

  const handleUnblockUser = async () => {
    if (!contact?.id || !currentUser?.id) return
    try {
      await unblockUser(currentUser.id, contact.id)
      setBlockState({ blockedByMe: false, blockedByThem: false })
      showToast('User unblocked')
    } catch (err) {
      console.error('Unblock user error:', err)
      showToast('Failed to unblock user', true)
    }
  }

  const handleDeleteChatForMe = async () => {
    if (!chatId || !currentUser?.id || !contact?.id) return
    try {
      await deleteChatForUser(chatId, currentUser.id, contact.id)
      navigate('/home', { replace: true })
      showToast('Chat removed')
    } catch (err) {
      console.error('Delete chat error:', err)
      showToast('Failed to remove chat', true)
    }
  }

  const openConfirmModal = (type, title, description, onConfirm) => {
    setConfirmModal({ type, title, description, onConfirm })
    setMenuOpen(false)
  }

  const closeConfirmModal = () => setConfirmModal(null)

  // Custom DoubleCheck component
const DoubleCheck = ({ size = 10, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size * 1.5, height: size }}>
    <Check size={size} className="absolute left-0" />
    <Check size={size} className="absolute left-1.5" />
  </div>
)

// Message status indicator using custom component
const MessageStatus = ({ message, isMe }) => {
  if (!isMe || message.deleted) return null
  if (message.is_sending) {
    return <Loader size={10} className="animate-spin text-gray-400" />
  }
  if (message.is_read) {
    return (
      <div className="flex -space-x-1">
        <Check size={8} className="text-blue-400" />
        <Check size={8} className="text-blue-400" />
      </div>
    )
  }
  if (message.is_delivered) {
    return (
      <div className="flex -space-x-1">
        <Check size={8} className="text-gray-400" />
        <Check size={8} className="text-gray-400" />
      </div>
    )
  }
  return <Check size={10} className="text-gray-400" />
}

  // Lazy image component with placeholder
  const LazyImage = ({ src, alt, className, onClick }) => {
    const [isLoaded, setIsLoaded] = useState(false)
    const [imgSrc, setImgSrc] = useState(null)
    
    useEffect(() => {
      loadImageFromCache(src).then(setImgSrc)
    }, [src, loadImageFromCache])
    
    return (
      <div className="relative">
        {!isLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse rounded-lg flex items-center justify-center">
            <Loader size={24} className="animate-spin text-gray-500" />
          </div>
        )}
        <img
          src={imgSrc || src}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => setIsLoaded(true)}
          onClick={onClick}
        />
      </div>
    )
  }

  const renderMediaMessage = (msg) => {
    if (msg.deleted) return null

    switch (msg.media_type) {
      case 'image':
        return (
          <div className="space-y-1">
            <LazyImage
              src={msg.media_url}
              alt={msg.caption || 'Image'}
              className="max-w-full rounded-lg cursor-pointer max-h-64 object-cover"
              onClick={() => openMediaViewer(msg)}
            />
            {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
          </div>
        )
      case 'video':
        return (
          <div className="space-y-1">
            <video
              src={msg.media_url}
              controls
              className="max-w-full rounded-lg max-h-64"
              poster="/video-poster.png"
            />
            {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
          </div>
        )
      case 'document':
        const fileIcon = msg.media_name?.match(/\.(pdf)$/i) ? <FileText size={24} /> :
                         msg.media_name?.match(/\.(mp3|wav)$/i) ? <Music size={24} /> :
                         <File size={24} />
        return (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            {fileIcon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.media_name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(msg.media_size || 0)}</p>
            </div>
            <button
              onClick={() => handleDownloadMedia(msg.media_url, msg.media_name)}
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Download size={16} />
            </button>
          </div>
        )
      default:
        return null
    }
  }

  const groupMessagesByDate = () => {
    const groups = {}
    messages.forEach(msg => {
      const date = formatDate(msg.created_at)
      if (!groups[date]) groups[date] = []
      groups[date].push(msg)
    })
    return groups
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const user = await getCurrentUser()
      if (!mounted) return
      if (!user) {
        navigate('/login', { replace: true })
        return
      }
      setCurrentUser(user)
    }
    init()
    return () => { mounted = false; if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current) }
  }, [navigate])

  useEffect(() => {
    if (!currentUser || !chatId) return
    loadChat()
  }, [chatId, currentUser, loadChat])

  useEffect(() => {
    const checkBlockState = async () => {
      if (!currentUser?.id || !contact?.id) return
      const relationship = await getBlockRelationship(currentUser.id, contact.id)
      setBlockState(relationship)
    }
    checkBlockState()
  }, [currentUser, contact])

  useEffect(() => {
    if (!chatId || !currentUser) return

    const wsUrl = import.meta.env.VITE_CHAT_WS_URL || 'ws://localhost:3001'
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'subscribe', chatId }))
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.type !== 'chat:update' || payload.chatId !== chatId || !payload.message) return

        setMessages(prev => {
          if (prev.some(msg => msg.id === payload.message.id)) return prev
          return mergeUniqueMessages(prev, [payload.message])
        })

        if (payload.message.sender_id !== currentUser.id) {
          markMessagesAsRead(chatId, currentUser.id)
        }

        requestAnimationFrame(() => scrollToBottom())
      } catch (error) {
        console.error('WebSocket chat update failed:', error)
      }
    }

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [chatId, currentUser, mergeUniqueMessages, scrollToBottom])

  useEffect(() => {
    if (chatId && currentUser) {
      const cleanup = setupRealtimeSubscription()
      return cleanup
    }
  }, [chatId, currentUser, setupRealtimeSubscription])

  useEffect(() => {
    if (!chatId || !currentUser?.id) return

    readReceiptSubscriptionRef.current?.unsubscribe?.()
    readReceiptSubscriptionRef.current = subscribeToReadReceipts(chatId, currentUser.id, (messageId) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, is_read: true, is_delivered: true } : msg
      ))
    })

    return () => readReceiptSubscriptionRef.current?.unsubscribe?.()
  }, [chatId, currentUser?.id])

  useEffect(() => {
    if (!chatId || !currentUser?.id) return

    typingSubscriptionRef.current?.unsubscribe?.()
    typingSubscriptionRef.current = subscribeToTypingStatus(chatId, currentUser.id, (typing) => {
      setContactTyping(typing)
      if (!typing) {
        setTimeout(() => setContactTyping(false), 500)
      }
    })

    return () => typingSubscriptionRef.current?.unsubscribe?.()
  }, [chatId, currentUser?.id])

  useEffect(() => {
    if (!loading && messages.length > 0) {
      requestAnimationFrame(() => scrollToBottom())
    }
  }, [loading, messages, scrollToBottom])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
    setShowScrollToBottom(!nearBottom)
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('.menu-container')) setMenuOpen(false)
      if (attachMenuOpen && !e.target.closest('.attach-container')) setAttachMenuOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen, attachMenuOpen])

  useEffect(() => {
    if (!mediaViewerOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        showNextMedia()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        showPreviousMedia()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMediaViewer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mediaViewerOpen, showNextMedia, showPreviousMedia, closeMediaViewer])

  const messageGroups = groupMessagesByDate()
  const mediaItems = getMediaItems()
  const currentMedia = mediaItems[mediaViewerIndex] || null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-2 py-2 lg:px-6 lg:py-6">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 mx-auto w-full max-w-4xl px-4 py-2 flex items-center justify-between bg-[#0a0a0a]/85 backdrop-blur-lg border-b border-white/5 lg:rounded-b-2xl lg:border-x lg:border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="p-1.5 rounded-xl hover:bg-white/5 transition">
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => contact?.id && navigate(`/chat/${chatId}/profile/${contact.id}`)}
            className="flex items-center gap-3 rounded-xl p-1 hover:bg-white/5 transition"
          >
            <img
              src={contact?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(contact?.full_name || 'User')}`}
              alt={contact?.full_name}
              className="w-10 h-10 rounded-full object-cover border border-white/20"
            />
            <div>
              <h2 className="font-semibold text-base text-left">{contact?.full_name || contact?.username || 'Unknown'}</h2>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${contactTyping ? 'bg-blue-500' : contactStatus === 'online' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                <span className="text-[11px] text-gray-400">
                  {contactTyping ? 'Typing...' : contactStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="relative menu-container">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-xl hover:bg-white/5 transition">
            <MoreVertical size={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 p-1 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50">
              <button onClick={() => openConfirmModal('clear', 'Clear chat?', 'This will delete all messages in this conversation for everyone.', handleClearChat)} className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3">
                <Trash2 size={16} /> Clear Chat
              </button>
              <button onClick={() => openConfirmModal('block', 'Block this user?', 'You will no longer be able to send messages to each other.', handleBlockUser)} className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3">
                <Slash size={16} /> Block User
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Edit Message Bar */}
      {editingMessage && (
        <div className="fixed top-14 left-0 right-0 z-30 bg-[#1c1c1e]/95 backdrop-blur-lg border-b border-white/10 px-4 py-2 flex items-center gap-2 animate-slide-down">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Editing message</p>
            <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()} className="w-full bg-transparent outline-none text-sm text-white" autoFocus />
          </div>
          <button onClick={handleSaveEdit} className="p-2 rounded-lg bg-white text-black hover:bg-gray-100 transition"><Save size={16} /></button>
          <button onClick={cancelEdit} className="p-2 rounded-lg hover:bg-white/10 transition"><X size={16} /></button>
        </div>
      )}

      {/* Chat Messages */}
      <div ref={messagesContainerRef} onScroll={handleChatScroll} className={`w-full max-w-3xl flex-1 overflow-y-auto pt-16 pb-24 px-4 lg:rounded-3xl lg:border lg:border-white/5 lg:bg-[#0d0d0d] ${editingMessage ? 'mt-12' : ''}`}>
        {messages.length === 0 && (
          <div className="flex h-full min-h-[50vh] items-center justify-center px-4 text-center">
            <div className="max-w-sm rounded-3xl border border-white/8 bg-[#121212]/80 p-6 shadow-2xl">
              <p className="text-sm text-gray-300">You are now friends with <span className="font-semibold text-white">{contact?.full_name || contact?.username || 'this contact'}</span>.</p>
              <p className="mt-2 text-sm text-gray-400">Begin the conversation.</p>
            </div>
          </div>
        )}

        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date}>
            <div className="text-center my-4">
              <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">{date}</span>
            </div>
            {msgs.map((msg) => {
              const isMe = msg.sender_id === currentUser?.id
              const isDeleted = msg.deleted
              const hasMedia = msg.media_url
              const isSending = msg.is_sending
              const uploadProgress = msg.upload_progress
              const repliedMessage = messages.find(item => item.id === msg.reply_to_id)
              const replyText = repliedMessage?.message || msg.reply_to_preview || 'A message'
              
              return (
                <div key={msg.id} className={`message-enter flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 message-item group`} onContextMenu={(e) => { e.preventDefault(); if (!isDeleted && !isSending) { setSelectedMessage(msg); setActionSheetOpen(true) } }}>
                  <div className={`max-w-[75%] px-4 py-2.5 ${isMe ? 'bg-white text-black rounded-2xl rounded-tr-none' : 'bg-[#1c1c1e]/90 backdrop-blur-sm text-white rounded-2xl rounded-tl-none'}`}>
                    {isSending && uploadProgress !== undefined && uploadProgress < 100 && (
                      <div className="mb-2 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                    {(msg.reply_to_id || msg.reply_to_preview) && (
                      <div className="mb-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Replying to</p>
                        <p className="mt-1 line-clamp-2 text-gray-600 dark:text-gray-300">{replyText}</p>
                      </div>
                    )}
                    {hasMedia && renderMediaMessage(msg)}
                    {!hasMedia && !isDeleted && (
                      <>
                        <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.message}</p>
                        {msg.edited && <span className="text-[9px] text-gray-400 italic ml-1">(edited)</span>}
                      </>
                    )}
                    {isDeleted && <p className="text-sm italic text-gray-500">Message deleted</p>}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={`text-[9px] ${isMe ? 'text-gray-500' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</span>
                      {isMe && !isDeleted && (
                        <div className="flex items-center gap-1">
                          {msg.edited && <Edit2 size={8} className="text-gray-400" />}
                          <MessageStatus message={msg} isMe={isMe} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScrollToBottom && (
        <button onClick={scrollToBottom} className="fixed bottom-24 right-4 z-40 rounded-full bg-white text-black p-3 shadow-xl hover:bg-gray-100 transition">
          <ArrowDown size={18} />
        </button>
      )}

      {/* Typing Indicator */}
      {contactTyping && (
        <div className="fixed bottom-20 left-4 px-4 py-2 rounded-xl bg-[#1c1c1e]/90 backdrop-blur-sm flex items-center gap-2 z-30">
          <div className="flex gap-1">
            <span className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-gray-400">{contact?.full_name} is typing...</span>
        </div>
      )}

      {/* Reply Preview */}
      {replyToMessage && (
        <div className="fixed bottom-16 left-0 right-0 z-40 mx-3 rounded-2xl border border-white/10 bg-[#1c1c1e]/95 px-3 py-2 text-sm shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Replying to</p>
              <p className="truncate text-gray-100">{replyToMessage.message || 'This message'}</p>
            </div>
            <button onClick={() => setReplyToMessage(null)} className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Input Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-4xl px-3 py-2 flex items-center gap-2 bg-[#0a0a0a]/85 backdrop-blur-lg border-t border-white/5 lg:rounded-t-2xl lg:border-x lg:border-white/5">
        {blockState.blockedByMe || blockState.blockedByThem ? (
          <div className="w-full rounded-2xl border border-white/10 bg-[#121212]/90 px-4 py-3 text-sm text-gray-200 shadow-xl">
            {blockState.blockedByMe ? (
              <>
                <p className="font-medium text-white">You blocked {contact?.full_name || contact?.username || 'this contact'}.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={handleUnblockUser} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition">Unblock</button>
                  <button onClick={handleDeleteChatForMe} className="rounded-xl bg-white/8 px-3 py-2 text-sm text-white hover:bg-white/12 transition">Delete chat</button>
                </div>
              </>
            ) : (
              <p className="text-gray-200">You have been blocked by {contact?.full_name || contact?.username || 'this contact'}.</p>
            )}
          </div>
        ) : (
          <>
            <div className="relative attach-container">
              <button onClick={() => setAttachMenuOpen(!attachMenuOpen)} className="p-2 rounded-full hover:bg-white/10 transition">
                <Paperclip size={20} />
              </button>
              {attachMenuOpen && (
                <div className="absolute bottom-12 left-0 w-48 p-2 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
                  <label className="w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-3 hover:bg-white/10 cursor-pointer">
                    <ImageIcon size={16} /> Image
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
                  </label>
                  <label className="w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-3 hover:bg-white/10 cursor-pointer">
                    <Video size={16} /> Video
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
                  </label>
                  <label className="w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-3 hover:bg-white/10 cursor-pointer">
                    <File size={16} /> Document
                    <input type="file" accept=".pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={(e) => handleFileSelect(e, 'document')} />
                  </label>
                </div>
              )}
            </div>

            <div className="w-full sm:w-[80%] bg-[#1c1c1e] rounded-full px-4 py-2 flex items-center">
              <input ref={inputRef} type="text" placeholder="Message" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping() }} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-gray-500" disabled={!!editingMessage} />
              <button onClick={() => showToast('Emoji picker coming soon')} className="p-1 rounded-full hover:bg-white/10 transition mr-1"><Smile size={16} className="text-gray-400" /></button>
            </div>

            <button onClick={handleSendMessage} disabled={sending || (!newMessage.trim() && pendingFiles.length === 0) || !!editingMessage} className="p-2 rounded-full bg-white text-black hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={20} />
            </button>
          </>
        )}
      </footer>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151515] p-5 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Confirmation</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{confirmModal.title}</h3>
            <p className="mt-2 text-sm text-gray-300">{confirmModal.description}</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={closeConfirmModal} className="rounded-xl bg-white/5 px-4 py-2 text-sm text-gray-100 hover:bg-white/10 transition">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreviewModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowPreviewModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1c1c1e]/98 backdrop-blur-xl rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-[#1c1c1e] p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold">Preview ({pendingFiles.length} files)</h3>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 rounded-full hover:bg-white/10"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              {pendingFiles.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex gap-3">
                    {item.type === 'image' && item.preview && <img src={item.preview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />}
                    {item.type === 'video' && item.preview && <video src={item.preview} className="w-20 h-20 rounded-lg object-cover" />}
                    {item.type === 'document' && <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center"><File size={32} /></div>}
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{item.file.name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(item.file.size)}</p>
                      <input type="text" placeholder="Add a caption..." value={item.caption} onChange={(e) => updateCaption(item.id, e.target.value)} className="mt-2 w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-white/30" />
                    </div>
                    <button onClick={() => removePendingFile(item.id)} className="p-1 rounded-full hover:bg-red-500/20 text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 bg-[#1c1c1e] p-4 border-t border-white/10 flex gap-3">
              <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">Cancel</button>
              <button onClick={sendAllPendingFiles} className="flex-1 py-2 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition">Send {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}</button>
            </div>
          </div>
        </>
      )}

      {/* Media Viewer Modal */}
      {mediaViewerOpen && currentMedia && (
        <>
          <div className="fixed inset-0 z-70 bg-black/95" onClick={closeMediaViewer} />
          <div className="fixed inset-0 z-80 flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <button onClick={closeMediaViewer} className="rounded-full bg-white/10 p-2 hover:bg-white/15" aria-label="Close media viewer">
                  <X size={18} />
                </button>
                <div>
                  <p className="text-sm font-semibold">Media viewer</p>
                  <p className="text-[11px] text-gray-300">{mediaViewerIndex + 1} / {mediaItems.length}</p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadMedia(currentMedia.media_url, currentMedia.media_name || 'media')}
                className="rounded-full bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              >
                Download
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center px-2 pb-4" onClick={(e) => e.stopPropagation()}>
              <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-black">
                {currentMedia.media_type === 'image' ? (
                  <img
                    src={currentMedia.media_url}
                    alt={currentMedia.caption || 'Image'}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <video
                    src={currentMedia.media_url}
                    controls
                    className="h-full w-full object-contain bg-black"
                  />
                )}
              </div>
            </div>

            {currentMedia.caption && (
              <div className="px-4 pb-5 text-center text-sm text-gray-200" onClick={(e) => e.stopPropagation()}>
                {currentMedia.caption}
              </div>
            )}
          </div>
        </>
      )}

      {/* Action Sheet for Message Long Press */}
      {actionSheetOpen && selectedMessage && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setActionSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300">
            <div className="bg-[#1c1c1e]/98 backdrop-blur-xl rounded-t-3xl p-4 pb-8">
              <div className="flex gap-2 justify-around flex-wrap">
                {selectedMessage.sender_id === currentUser?.id && (
                  <>
                    <button onClick={() => handleStartEdit(selectedMessage)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition"><Edit2 size={20} /><span className="text-[10px]">Edit</span></button>
                    <button onClick={() => handleDeleteMessage(selectedMessage.id, false)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition"><Trash2 size={20} /><span className="text-[10px]">Delete</span></button>
                    <button onClick={() => handleDeleteMessage(selectedMessage.id, true)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition"><Users size={20} /><span className="text-[10px]">Delete All</span></button>
                  </>
                )}
                <button onClick={() => { setReplyToMessage(selectedMessage); setActionSheetOpen(false); setSelectedMessage(null); inputRef.current?.focus() }} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition"><CornerUpLeft size={20} /><span className="text-[10px]">Reply</span></button>
                <button onClick={() => handleCopyMessage(selectedMessage.message)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition"><Copy size={20} /><span className="text-[10px]">Copy</span></button>
              </div>
              <button onClick={() => { setActionSheetOpen(false); setSelectedMessage(null) }} className="w-full mt-3 py-2 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/15 transition">Cancel</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes messageFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message-enter { animation: messageFadeIn 0.3s ease; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        .typing-dot { animation: bounce 1.4s infinite; }
        @keyframes fade-in-up { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease; }
        @keyframes slide-down { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .animate-slide-down { animation: slide-down 0.3s ease; }
      `}</style>
    </div>
  )
}