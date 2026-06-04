import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  MessageCircle,
  Edit,
  Link as LinkIcon,
  Copy,
  Edit2,
  User,
  Home,
  Settings,
  Camera,
  Check,
  X,
  Save,
} from 'react-feather'
import supabase,{
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
} from '../services/supabase'

export default function Profile() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    dob: '',
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [toast, setToast] = useState(null)
  const [networkInfo, setNetworkInfo] = useState(null)
  const [loginHistory, setLoginHistory] = useState([])
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, field: null })
  const fileInputRef = useRef(null)

  // Show toast notification
  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 2000)
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  // Load profile data
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get current user
      const user = await getCurrentUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUser(user)

      // Determine if viewing own profile
      const targetUserId = userId || user.id
      const isOwn = targetUserId === user.id
      setIsOwnProfile(isOwn)

      // Load profile
      const profileData = await getUserProfile(targetUserId)
      if (profileData) {
        setProfile(profileData)
        setEditForm({
          full_name: profileData.full_name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          dob: profileData.dob || '',
        })
      } else if (isOwn) {
        // Create basic profile if it doesn't exist
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.email?.split('@')[0] || 'User',
            username: user.email?.split('@')[0] || user.id.slice(0, 8),
            email: user.email,
            status: 'online',
          })
          .select()
          .single()

        if (!error && newProfile) {
          setProfile(newProfile)
          setEditForm({
            full_name: newProfile.full_name || '',
            username: newProfile.username || '',
            bio: newProfile.bio || '',
            dob: newProfile.dob || '',
          })
        }
      }
    } catch (err) {
      console.error('Load profile error:', err)
      showToast('Failed to load profile', true)
    } finally {
      setLoading(false)
    }
  }, [userId, navigate])

  // Handle avatar upload
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    const extension = file.name?.split('.').pop()?.toLowerCase() || ''
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif']
    const isImageMime = file.type.startsWith('image/')
    const isAllowedExtension = allowedExtensions.includes(extension)

    if (!isImageMime && !isAllowedExtension) {
      showToast('Please upload a valid image file', true)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size must be less than 10MB', true)
      return
    }

    try {
      setUploadingAvatar(true)
      const avatarUrl = await uploadAvatar(currentUser.id, file)
      
      // Update profile with new avatar
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id)

      if (error) throw error

      setProfile(prev => ({ ...prev, avatar: avatarUrl }))
      showToast('Avatar updated successfully')
    } catch (err) {
      console.error('Avatar upload error:', err)
      showToast('Failed to upload avatar', true)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Handle profile update
  const handleUpdateProfile = async () => {
    try {
      setLoading(true)

      // Validate username
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
      if (!usernameRegex.test(editForm.username)) {
        showToast('Username must be 3-20 characters (letters, numbers, underscore)', true)
        return
      }

      // Check if username is taken (only if changed)
      if (editForm.username !== profile.username) {
        const { data: existing, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', editForm.username.toLowerCase())
          .neq('id', currentUser.id)
          .single()

        if (existing) {
          showToast('Username is already taken', true)
          return
        }
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          username: editForm.username.toLowerCase().trim(),
          bio: editForm.bio?.trim() || '',
          dob: editForm.dob || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id)

      if (error) throw error

      setProfile(prev => ({
        ...prev,
        full_name: editForm.full_name.trim(),
        username: editForm.username.toLowerCase().trim(),
        bio: editForm.bio?.trim() || '',
        dob: editForm.dob || null,
      }))

      setEditing(false)
      showToast('Profile updated successfully')
    } catch (err) {
      console.error('Update profile error:', err)
      showToast('Failed to update profile', true)
    } finally {
      setLoading(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label} copied to clipboard`)
    } catch (err) {
      showToast('Failed to copy', true)
    }
    setContextMenu({ visible: false, x: 0, y: 0, field: null })
  }

  // Copy profile link
  const copyProfileLink = () => {
    const link = `${window.location.origin}/profile/${profile?.username || profile?.id}`
    copyToClipboard(link, 'Profile link')
  }

  // Handle context menu (right click / long press)
  const handleContextMenu = (e, field, value) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({
      visible: true,
      x: rect.left + 10,
      y: rect.bottom + 5,
      field: { name: field, value, label: field.replace('_', ' ').toUpperCase() },
    })
  }

  // Close context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0, field: null })
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadNetworkInfo = useCallback(async () => {
    try {
      const [ipResponse, geoResponse] = await Promise.all([
        fetch('https://api.ipify.org?format=json').then(res => res.json()).catch(() => null),
        fetch('https://ipapi.co/json/').then(res => res.json()).catch(() => null),
      ])

      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      const deviceLabel = navigator.userAgentData?.brands?.map(item => item.brand).join(' ') || navigator.userAgent || 'Current device'
      const region = [geoResponse?.city, geoResponse?.region, geoResponse?.country_name].filter(Boolean).join(', ')

      const detectedInfo = {
        ipAddress: ipResponse?.ip || 'Unavailable',
        region: region || 'Unavailable',
        country: geoResponse?.country_name || 'Unavailable',
        isp: geoResponse?.org || 'Unavailable',
        sim: geoResponse?.org || 'Not available in this browser',
        networkType: connection?.effectiveType || 'Unknown',
        connectionType: connection?.type || 'Unknown',
        device: deviceLabel,
        lastUpdated: new Date().toLocaleString(),
      }

      setNetworkInfo(detectedInfo)

      const history = JSON.parse(localStorage.getItem('hash_login_history') || '[]')
      const currentSession = {
        time: new Date().toISOString(),
        ip: detectedInfo.ipAddress,
        region: detectedInfo.region,
        device: detectedInfo.device,
        status: 'Active now',
      }

      const nextHistory = [currentSession, ...history].slice(0, 5)
      localStorage.setItem('hash_login_history', JSON.stringify(nextHistory))
      setLoginHistory(nextHistory)
    } catch (err) {
      console.error('Load network info error:', err)
      setNetworkInfo({
        ipAddress: 'Unavailable',
        region: 'Unavailable',
        country: 'Unavailable',
        isp: 'Unavailable',
        sim: 'Unavailable in this browser',
        networkType: navigator.onLine ? 'Online' : 'Offline',
        connectionType: 'Unknown',
        device: navigator.userAgent || 'Current device',
        lastUpdated: 'Unavailable',
      })
    }
  }, [])

  // Initialize
  useEffect(() => {
    loadProfile()
    loadNetworkInfo()
  }, [loadProfile, loadNetworkInfo])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="h-8 w-32 animate-pulse rounded-full bg-white/8" />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-white/8" />
            <div className="mx-auto mt-4 h-4 w-32 animate-pulse rounded-full bg-white/8" />
            <div className="mx-auto mt-3 h-3 w-24 animate-pulse rounded-full bg-white/8" />
          </div>
          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-2xl bg-white/8" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
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
        
        {isOwnProfile && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-xl hover:bg-white/5 transition"
          >
            <Edit size={20} />
          </button>
        )}
        
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
            >
              <X size={20} />
            </button>
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="p-2 rounded-xl bg-white text-black hover:bg-gray-100 transition disabled:opacity-50"
            >
              <Save size={20} />
            </button>
          </div>
        )}
      </header>

      <div className="pt-20" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Avatar Section */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="relative inline-block group">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-xl bg-gradient-to-br from-[#2c2c30] to-[#1c1c1e]">
              <img
                src={profile?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(profile?.full_name || 'User')}`}
                alt={profile?.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            {isOwnProfile && !editing && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-1 right-1 bg-[#252525] p-1.5 rounded-full border border-white/20 shadow-md hover:bg-white/10 transition disabled:opacity-50"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
          
          {editing ? (
            <div className="mt-4 space-y-2">
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Full Name"
                className="text-2xl md:text-3xl font-bold text-center bg-transparent border-b border-white/20 focus:border-white/50 outline-none px-2 py-1"
              />
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-400">@</span>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="username"
                  className="text-gray-400 text-sm text-center bg-transparent border-b border-white/20 focus:border-white/50 outline-none px-2 py-1"
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl md:text-3xl font-bold mt-4 tracking-tight">
                {profile?.full_name || 'Anonymous User'}
              </h2>
              <p className="text-gray-400 text-sm">
                @{profile?.username || 'username'}
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        {!editing && isOwnProfile && (
          <div className="flex flex-wrap gap-3 justify-center mb-8 animate-fade-in-up">
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition"
            >
              <Edit2 size={16} /> Edit Profile
            </button>
            <button
              onClick={copyProfileLink}
              className="px-5 py-2.5 rounded-xl bg-[#252525] border border-white/15 font-medium flex items-center gap-2 hover:bg-white/10 transition"
            >
              <LinkIcon size={16} /> Copy Link
            </button>
          </div>
        )}

        {/* Profile Information Card */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 md:p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-semibold text-lg">Profile Information</h3>
            <User size={16} className="text-gray-500" />
          </div>

          {/* Full Name */}
          <div
            onContextMenu={(e) => handleContextMenu(e, 'full_name', profile?.full_name)}
            className="p-3 flex justify-between items-center rounded-xl hover:bg-white/5 transition cursor-pointer"
            onClick={() => isOwnProfile && copyToClipboard(profile?.full_name, 'Name')}
          >
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Full Name</p>
              {editing ? (
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="text-base font-medium mt-0.5 bg-transparent border-b border-white/20 focus:border-white/50 outline-none"
                />
              ) : (
                <p className="text-base font-medium mt-0.5">{profile?.full_name || 'Not set'}</p>
              )}
            </div>
            {!editing && <Copy size={16} className="text-gray-500" />}
          </div>

          {/* Username */}
          <div
            onContextMenu={(e) => handleContextMenu(e, 'username', `@${profile?.username}`)}
            className="p-3 flex justify-between items-center rounded-xl hover:bg-white/5 transition cursor-pointer"
            onClick={() => isOwnProfile && copyToClipboard(`@${profile?.username}`, 'Username')}
          >
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Username</p>
              {editing ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-gray-500">@</span>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    className="text-base font-medium bg-transparent border-b border-white/20 focus:border-white/50 outline-none"
                  />
                </div>
              ) : (
                <p className="text-base font-medium mt-0.5">@{profile?.username || 'username'}</p>
              )}
            </div>
            {!editing && <Copy size={16} className="text-gray-500" />}
          </div>

          {/* Email (only visible to owner) */}
          {isOwnProfile && (
            <div
              onContextMenu={(e) => handleContextMenu(e, 'email', profile?.email)}
              className="p-3 flex justify-between items-center rounded-xl hover:bg-white/5 transition cursor-pointer"
              onClick={() => copyToClipboard(profile?.email, 'Email')}
            >
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-base font-medium mt-0.5">{profile?.email || 'Not set'}</p>
              </div>
              {!editing && <Copy size={16} className="text-gray-500" />}
            </div>
          )}

          {/* Bio */}
          <div
            onContextMenu={(e) => handleContextMenu(e, 'bio', profile?.bio)}
            className="p-3 rounded-xl hover:bg-white/5 transition cursor-pointer"
          >
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Bio</p>
              {editing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell something about yourself..."
                  rows={3}
                  className="w-full text-sm font-medium mt-0.5 bg-transparent border border-white/20 rounded-lg p-2 focus:border-white/50 outline-none resize-none"
                />
              ) : (
                <p className="text-sm font-medium mt-0.5 leading-relaxed">
                  {profile?.bio || 'No bio yet.'}
                </p>
              )}
            </div>
          </div>

          {/* Date of Birth (only visible to owner) */}
          {isOwnProfile && (
            <div
              onContextMenu={(e) => handleContextMenu(e, 'dob', profile?.dob)}
              className="p-3 flex justify-between items-center rounded-xl hover:bg-white/5 transition cursor-pointer"
            >
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Date of Birth</p>
                {editing ? (
                  <input
                    type="date"
                    value={formatDateForInput(editForm.dob)}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="text-base font-medium mt-0.5 bg-transparent border-b border-white/20 focus:border-white/50 outline-none"
                  />
                ) : (
                  <p className="text-base font-medium mt-0.5">{formatDate(profile?.dob)}</p>
                )}
              </div>
              {!editing && profile?.dob && <Copy size={16} className="text-gray-500" />}
            </div>
          )}
        </div>

        {/* Network & Login Activity Card (only for own profile) */}
        {isOwnProfile && (
          <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-5 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="font-semibold text-lg">Network & Login Activity</h3>
                <p className="text-xs text-gray-400">IP, region, carrier, and recent sign-ins</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                Live
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">IP Address</p>
                <p className="mt-1 text-sm font-medium text-white">{networkInfo?.ipAddress || 'Detecting...'}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Region</p>
                <p className="mt-1 text-sm font-medium text-white">{networkInfo?.region || 'Detecting...'}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">SIM / Carrier</p>
                <p className="mt-1 text-sm font-medium text-white">{networkInfo?.sim || 'Unavailable'}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Network Type</p>
                <p className="mt-1 text-sm font-medium text-white">{networkInfo?.networkType || 'Unknown'} · {networkInfo?.connectionType || 'Unknown'}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3 md:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Device / Browser</p>
                <p className="mt-1 text-sm font-medium text-white">{networkInfo?.device || 'Current device'}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Recent Login History</h4>
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Last 5 sessions</span>
              </div>
              <div className="space-y-2">
                {loginHistory.length > 0 ? (
                  loginHistory.map((entry, index) => (
                    <div key={`${entry.time}-${index}`} className="rounded-2xl border border-white/8 bg-[#151515] p-3 text-sm text-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{entry.status}</p>
                          <p className="text-xs text-gray-400">{new Date(entry.time).toLocaleString()}</p>
                        </div>
                        <span className="text-[11px] text-gray-400">{entry.ip}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{entry.region} · {entry.device}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No login history available yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Context Menu */}
      {contextMenu.visible && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu({ visible: false, x: 0, y: 0, field: null })}
          />
          <div
            className="fixed z-50 bg-[#1c1c1e]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl min-w-[160px] py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => copyToClipboard(contextMenu.field?.value, contextMenu.field?.label)}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-white/10 transition"
            >
              <Copy size={16} /> Copy
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