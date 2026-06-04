import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Search,
  User,
  Shield,
  Database,
  HelpCircle,
  Users,
  ChevronRight,
  Settings as SettingsIcon,
  Home,
  MoreVertical,
  Share2,
  Copy,
} from 'react-feather'
import supabase,{
  getCurrentUser,
  getUserProfile,
} from '../services/supabase'

export default function Settings() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState(null)
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })
  const usernameActionRef = useRef(null)

  // Settings sections data
  const settingsSections = [
    {
      id: 'account',
      title: 'Account',
      description: 'Profile, phone, email, password',
      icon: User,
      path: '/account',
      color: 'text-white/80',
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'End-to-end encryption, blocks',
      icon: Shield,
      path: '/privacy-settings',
      color: 'text-white/80',
    },
    {
      id: 'storage',
      title: 'Storage & Data',
      description: 'Manage space, auto-download',
      icon: Database,
      path: '/storage-settings',
      color: 'text-white/80',
    },
    {
      id: 'help',
      title: 'Help & Feedback',
      description: 'Support center, report issue',
      icon: HelpCircle,
      path: '/help',
      color: 'text-white/80',
    },
    {
      id: 'invite',
      title: 'Invite a Friend',
      description: 'Share Hash with your contacts',
      icon: Users,
      path: null,
      color: 'text-white/80',
    },
  ]

  // Show toast notification
  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 2000)
  }

  // Copy username to clipboard
  const copyUsername = async () => {
    if (profile?.username) {
      await navigator.clipboard.writeText(`@${profile.username}`)
      showToast('Username copied to clipboard')
    }
    setContextMenu({ visible: false, x: 0, y: 0 })
  }

  // Share username
  const shareUsername = async () => {
    const shareText = `Join me on Hash! My username is @${profile?.username}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Invite to Hash', text: shareText })
      } catch (err) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareText)
      showToast('Share text copied to clipboard')
    }
    setContextMenu({ visible: false, x: 0, y: 0 })
  }

  // Handle invite
  const handleInvite = async () => {
    const shareText = `Join me on Hash! It's a secure messaging app. Download it today!`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Invite to Hash',
          text: shareText,
          url: window.location.origin,
        })
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText)
      showToast('Invite link copied to clipboard')
    }
  }

  // Handle username action button click
  const handleUsernameAction = (e) => {
    e.stopPropagation()
    const rect = usernameActionRef.current?.getBoundingClientRect()
    if (rect) {
      setContextMenu({
        visible: true,
        x: rect.left - 100,
        y: rect.bottom + 5,
      })
    }
  }

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.context-menu') && e.target !== usernameActionRef.current) {
        setContextMenu({ visible: false, x: 0, y: 0 })
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Load profile data
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      
      const user = await getCurrentUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUser(user)

      const profileData = await getUserProfile(user.id)
      if (profileData) {
        setProfile(profileData)
      }
    } catch (err) {
      console.error('Load profile error:', err)
      showToast('Failed to load profile', true)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Filter settings based on search
  const filteredSettings = settingsSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Initialize
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="h-8 w-36 animate-pulse rounded-full bg-white/8" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-white/8" />
          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/8" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 px-5 py-3 flex items-center justify-between gap-3 bg-[#0a0a0a]/75 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2"
          >
            <div className="bg-[#252525] p-1.5 rounded-xl shadow-md">
              <MessageCircle size={20} className="text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Hash<span className="text-gray-400">.</span>
            </span>
          </button>
        </div>
        
        <div className="flex-1 max-w-[220px] md:max-w-sm">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 mt-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1c1c1e] border border-[#2e2e32] rounded-xl py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#6b6b70] placeholder:text-gray-500"
            />
          </div>
        </div>
        
        <div className="w-8"></div> {/* Spacer for balance */}
      </header>

      <div className="pt-20" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Profile Summary Card */}
        <div className="bg-gradient-to-br from-[#141418] to-[#0f0f12] border border-white/5 rounded-2xl p-5 animate-fade-in-up">
  <div className="flex items-center gap-4">
    {/* Avatar with online status */}
    <div className="relative">
      <img
        src={profile?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(profile?.full_name || 'User')}`}
        alt={profile?.full_name}
        className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shadow-lg"
      />
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-[#141418]">
        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
      </div>
    </div>

    {/* Profile Info */}
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-white">
          {profile?.full_name || 'Your Profile'}
        </h3>
        <button
          ref={usernameActionRef}
          onClick={handleUsernameAction}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition"
          aria-label="More options"
        >
          <MoreVertical size={16} />
        </button>
      </div>
      
      <p className="text-gray-400 text-sm mt-0.5">
        @{profile?.username || 'username'}
      </p>
      
      <div className="flex items-center gap-1.5 mt-1">
        <p className="text-xs text-gray-500 truncate">
          {profile?.email || currentUser?.email}
        </p>
      </div>
    </div>
  </div>
</div>

        {/* Settings List */}
        <div className="space-y-2 mt-6">
          {filteredSettings.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => {
                  if (section.id === 'invite') {
                    handleInvite()
                  } else if (section.path) {
                    navigate(section.path)
                  } else {
                    showToast(`${section.title} feature coming soon`)
                  }
                }}
                className="w-full bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition animate-fade-in-up"
                style={{ animationDelay: `${settingsSections.indexOf(section) * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon size={20} className={section.color} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{section.title}</p>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            )
          })}
        </div>

        {/* Version Info */}
        <div className="text-center mt-8 animate-fade-in-up">
          <p className="text-xs text-gray-600">Hash for Web · Version 1.0.0</p>
          <p className="text-[10px] text-gray-700 mt-1">
            © 2026 Hash — Secure messaging reimagined
          </p>
        </div>
      </main>

      {/* Context Menu for Username Actions */}
      {contextMenu.visible && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
          />
          <div
            className="context-menu fixed z-50 min-w-[180px] py-1 bg-[#1c1c1e]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={shareUsername}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-white/10 transition"
            >
              <Share2 size={16} /> Share Username
            </button>
            <button
              onClick={copyUsername}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-white/10 transition"
            >
              <Copy size={16} /> Copy Username
            </button>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm animate-fade-in-up ${
            toast.isError ? 'bg-red-500/90' : 'bg-[#252525]'
          } text-white border border-white/10`}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease forwards;
        }
      `}</style>
    </div>
  )
}