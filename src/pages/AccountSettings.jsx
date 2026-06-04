import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Camera,
  Mail,
  Phone,
  Lock,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Edit3,
  Settings as SettingsIcon,
  Save,
  X,
} from 'react-feather'
import supabase,{
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  updateEmail,
  updatePassword,
} from '../services/supabase'

export default function AccountSettings() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    dob: '',
  })
  
  // Error state
  const [errors, setErrors] = useState({
    full_name: '',
    username: '',
    bio: '',
    dob: '',
  })
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Show toast notification
  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 2000)
  }

  // Validation functions
  const validateFullName = (name) => {
    if (!name || name.trim().length < 2) {
      return 'Name must be at least 2 characters'
    }
    if (name.trim().length > 50) {
      return 'Name is too long'
    }
    return ''
  }

  const validateUsername = (username) => {
    const regex = /^[a-zA-Z0-9_]{3,20}$/
    if (!username || !regex.test(username)) {
      return '3-20 characters (letters, numbers, underscore only)'
    }
    return ''
  }

  const validateBio = (bio) => {
    if (bio && bio.length > 150) {
      return 'Bio cannot exceed 150 characters'
    }
    return ''
  }

  const validateDOB = (dob) => {
    if (!dob) return ''
    
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    if (age < 13) {
      return 'You must be at least 13 years old'
    }
    if (age > 120) {
      return 'Please enter a valid date of birth'
    }
    return ''
  }

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Validate on change
    let error = ''
    switch (field) {
      case 'full_name':
        error = validateFullName(value)
        break
      case 'username':
        error = validateUsername(value)
        break
      case 'bio':
        error = validateBio(value)
        break
      case 'dob':
        error = validateDOB(value)
        break
    }
    setErrors(prev => ({ ...prev, [field]: error }))
  }

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

  // Check username availability
  const isUsernameAvailable = async (username) => {
    if (username === profile?.username) return true
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .neq('id', currentUser.id)
      .single()
    
    return !data
  }

  // Save changes
  const handleSave = async () => {
    // Validate all fields
    const fullNameError = validateFullName(formData.full_name)
    const usernameError = validateUsername(formData.username)
    const bioError = validateBio(formData.bio)
    const dobError = validateDOB(formData.dob)
    
    setErrors({
      full_name: fullNameError,
      username: usernameError,
      bio: bioError,
      dob: dobError,
    })
    
    if (fullNameError || usernameError || bioError || dobError) {
      showToast('Please fix the errors before saving', true)
      return
    }
    
    // Check username availability
    const usernameAvailable = await isUsernameAvailable(formData.username)
    if (!usernameAvailable) {
      setErrors(prev => ({ ...prev, username: 'Username is already taken' }))
      showToast('Username is already taken', true)
      return
    }
    
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          username: formData.username.toLowerCase().trim(),
          bio: formData.bio?.trim() || null,
          dob: formData.dob || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id)

      if (error) throw error

      setProfile(prev => ({
        ...prev,
        full_name: formData.full_name.trim(),
        username: formData.username.toLowerCase().trim(),
        bio: formData.bio?.trim() || null,
        dob: formData.dob || null,
      }))
      
      showToast('Account settings saved successfully')
    } catch (err) {
      console.error('Save error:', err)
      showToast('Failed to save changes', true)
    } finally {
      setSaving(false)
    }
  }

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
        setFormData({
          full_name: profileData.full_name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          dob: profileData.dob || '',
        })
      }
    } catch (err) {
      console.error('Load profile error:', err)
      showToast('Failed to load profile', true)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Initialize
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Set max date for DOB (13 years minimum)
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
    .toISOString().split('T')[0]
  const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())
    .toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="h-8 w-32 animate-pulse rounded-full bg-white/8" />
          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/8" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-10">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 px-5 py-3 flex items-center justify-between bg-[#0a0a0a]/75 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-white/5 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold tracking-tight">Account</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <Check size={16} /> Save
            </>
          )}
        </button>
      </header>

      <div className="pt-20" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Profile Picture Section */}
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="relative inline-block group">
            <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-xl bg-gradient-to-br from-[#2c2c30] to-[#1c1c1e]">
              <img
                src={profile?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(profile?.full_name || 'User')}`}
                alt={profile?.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-[#252525] p-1.5 rounded-full border border-white/20 shadow-md hover:bg-white/10 transition disabled:opacity-50"
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
          </div>
          <p className="text-xs text-gray-500 mt-2">Tap to change profile picture</p>
        </div>

        {/* Profile Information Form */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 md:p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
            <h3 className="font-semibold text-lg">Profile Information</h3>
            <Edit3 size={16} className="text-gray-500" />
          </div>

          {/* Full Name */}
          <div className="relative mt-6">
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleFieldChange('full_name', e.target.value)}
              placeholder=" "
              className={`w-full bg-[#1c1c1e] border rounded-2xl p-4 text-white outline-none transition-all ${
                errors.full_name ? 'border-red-400' : 'border-[#2e2e32] focus:border-[#6b6b70]'
              }`}
            />
            <label className="absolute left-4 top-4 rounded-md border border-white/10 bg-[#1c1c1e] px-1.5 text-gray-400 text-sm pointer-events-none transition-all peer-focus:top-0 peer-focus:text-xs">
              Full Name
            </label>
            {errors.full_name && (
              <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
            )}
          </div>

          {/* Username */}
          <div className="relative mt-6">
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              placeholder=" "
              className={`w-full bg-[#1c1c1e] border rounded-2xl p-4 text-white outline-none transition-all ${
                errors.username ? 'border-red-400' : 'border-[#2e2e32] focus:border-[#6b6b70]'
              }`}
            />
            <label className="absolute left-4 top-4 rounded-md border border-white/10 bg-[#1c1c1e] px-1.5 text-gray-400 text-sm pointer-events-none transition-all">
              Username
            </label>
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          {/* Bio */}
          <div className="relative mt-6">
            <textarea
              value={formData.bio || ''}
              onChange={(e) => handleFieldChange('bio', e.target.value)}
              placeholder=" "
              rows={3}
              className={`w-full bg-[#1c1c1e] border rounded-2xl p-4 text-white outline-none transition-all resize-none ${
                errors.bio ? 'border-red-400' : 'border-[#2e2e32] focus:border-[#6b6b70]'
              }`}
            />
            <label className="absolute left-4 top-4 rounded-md border border-white/10 bg-[#1c1c1e] px-1.5 text-gray-400 text-sm pointer-events-none transition-all">
              Bio
            </label>
            {errors.bio && (
              <p className="text-red-400 text-xs mt-1">{errors.bio}</p>
            )}
            <p className="text-right text-xs text-gray-500 mt-1">
              {(formData.bio?.length || 0)}/150
            </p>
          </div>

          {/* Date of Birth */}
          <div className="relative mt-6">
            <input
              type="date"
              value={formData.dob || ''}
              onChange={(e) => handleFieldChange('dob', e.target.value)}
              max={maxDate}
              min={minDate}
              className={`w-full bg-[#1c1c1e] border rounded-2xl p-4 text-white outline-none transition-all ${
                errors.dob ? 'border-red-400' : 'border-[#2e2e32] focus:border-[#6b6b70]'
              }`}
            />
            <label className="absolute left-4 top-4 rounded-md border border-white/10 bg-[#1c1c1e] px-1.5 text-gray-400 text-sm pointer-events-none transition-all">
              Date of Birth
            </label>
            {errors.dob && (
              <p className="text-red-400 text-xs mt-1">{errors.dob}</p>
            )}
          </div>
        </div>

        {/* Additional Account Settings */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-5 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <h3 className="font-semibold text-lg">Account Settings</h3>
            <SettingsIcon size={16} className="text-gray-500" />
          </div>

          <div className="space-y-3">
            {/* Email Setting */}
            <button
              onClick={() => showToast('Change email feature coming soon')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <span className="text-sm">Email Address</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{profile?.email || currentUser?.email}</span>
                <ChevronRight size={16} className="text-gray-500" />
              </div>
            </button>

            {/* Phone Setting (Optional) */}
            <button
              onClick={() => showToast('Phone verification coming soon')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm">Phone Number</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Not set</span>
                <ChevronRight size={16} className="text-gray-500" />
              </div>
            </button>

            {/* Password Setting */}
            <button
              onClick={() => showToast('Change password feature coming soon')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-gray-400" />
                <span className="text-sm">Password</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">········</span>
                <ChevronRight size={16} className="text-gray-500" />
              </div>
            </button>

            {/* Delete Account */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  showToast('Account deletion feature coming soon', true)
                }
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={16} className="text-red-400" />
                <span className="text-sm text-red-400">Delete Account</span>
              </div>
              <AlertTriangle size={16} className="text-red-400" />
            </button>
          </div>
        </div>
      </main>

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
        /* Floating label animation */
        input:not(:placeholder-shown) + label,
        input:focus + label,
        textarea:not(:placeholder-shown) + label,
        textarea:focus + label {
          top: -0.65rem;
          left: 0.8rem;
          font-size: 0.7rem;
          background: #1c1c1e;
          padding: 0 6px;
          color: #c0c0c0;
        }
        .relative input, .relative textarea {
          padding-top: 1.25rem;
        }
      `}</style>
    </div>
  )
}