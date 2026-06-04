import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Shield,
  Eye,
  UserCheck,
  CheckSquare,
  AlertTriangle,
  Info,
  Save,
  X,
} from 'react-feather'
import supabase,{
  getCurrentUser,
  getUserProfile,
} from '../services/supabase'

export default function PrivacySettings() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [toast, setToast] = useState(null)
  
  // Privacy settings state
  const [settings, setSettings] = useState({
    anti_phishing_code: '',
    last_seen_visibility: 'contacts',
    profile_visibility: 'everyone',
    read_receipts: true,
  })

  // Show toast notification
  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 2000)
  }

  // Load privacy settings from database
  const loadPrivacySettings = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Load privacy settings error:', error)
        return
      }

      if (data) {
        setSettings({
          anti_phishing_code: data.anti_phishing_code || '',
          last_seen_visibility: data.last_seen_visibility || 'contacts',
          profile_visibility: data.profile_visibility || 'everyone',
          read_receipts: data.read_receipts !== false,
        })
      }
    } catch (err) {
      console.error('Load privacy settings error:', err)
    }
  }, [])

  // Save privacy settings to database
  const savePrivacySettings = async () => {
    if (!currentUser) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: currentUser.id,
          anti_phishing_code: settings.anti_phishing_code || null,
          last_seen_visibility: settings.last_seen_visibility,
          profile_visibility: settings.profile_visibility,
          read_receipts: settings.read_receipts,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      showToast('Privacy settings saved successfully')
    } catch (err) {
      console.error('Save privacy settings error:', err)
      showToast('Failed to save settings', true)
    } finally {
      setSaving(false)
    }
  }

  // Handle anti-phishing code save
  const handleSavePhishingCode = async () => {
    if (settings.anti_phishing_code && settings.anti_phishing_code.length < 3) {
      showToast('Code must be at least 3 characters', true)
      return
    }
    if (settings.anti_phishing_code && settings.anti_phishing_code.length > 30) {
      showToast('Code too long (max 30 chars)', true)
      return
    }
    await savePrivacySettings()
  }

  // Handle deactivate account
  const handleDeactivateAccount = async () => {
    setShowDeactivateModal(false)
    showToast('Account deactivation feature coming soon')
    // Future implementation:
    // await supabase.auth.signOut()
    // navigate('/login')
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
      await loadPrivacySettings(user.id)
      setLoading(false)
    }
    init()
  }, [navigate, loadPrivacySettings])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="h-8 w-36 animate-pulse rounded-full bg-white/8" />
          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/8" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-10">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 px-5 py-3 flex items-center gap-3 bg-[#0a0a0a]/75 backdrop-blur-lg border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/5 transition flex items-center"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Privacy</h1>
        <div className="flex-1" />
        <button
          onClick={savePrivacySettings}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-white text-black text-sm font-medium flex items-center gap-2 hover:bg-gray-100 transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={14} /> Save All
            </>
          )}
        </button>
      </header>

      <div className="pt-20" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        
        {/* Anti-Phishing Code */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={20} className="text-emerald-400" />
                <h3 className="font-semibold text-base">Anti-Phishing Code</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Set a secret word that will appear in all official Hash emails to verify authenticity.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    value={settings.anti_phishing_code}
                    onChange={(e) => setSettings(prev => ({ ...prev, anti_phishing_code: e.target.value.toUpperCase() }))}
                    placeholder=" "
                    maxLength={30}
                    className="bg-[#1c1c1e] border border-[#2e2e32] rounded-xl px-4 py-2 text-sm text-white w-40 focus:border-gray-500 outline-none transition"
                  />
                  <label className="absolute left-3 -top-2.5 text-[10px] text-gray-500 bg-[#1c1c1e] px-1">
                    Your code
                  </label>
                </div>
                <button
                  onClick={handleSavePhishingCode}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/20 transition"
                >
                  Save
                </button>
              </div>
            </div>
            <button
              onClick={() => showToast('This code appears in official emails to confirm they\'re from Hash.')}
              className="text-gray-500 hover:text-white transition"
            >
              <Info size={16} />
            </button>
          </div>
        </div>

        {/* Last Seen Visibility */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={20} className="text-blue-400" />
                <h3 className="font-semibold text-base">Last Seen</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Control who can see your last active timestamp
              </p>
              <select
                value={settings.last_seen_visibility}
                onChange={(e) => setSettings(prev => ({ ...prev, last_seen_visibility: e.target.value }))}
                className="bg-[#1c1c1e] border border-[#2e2e32] rounded-xl px-4 py-2 text-sm text-white focus:border-gray-500 outline-none transition cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
        </div>

        {/* Profile Visibility */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck size={20} className="text-purple-400" />
                <h3 className="font-semibold text-base">Profile Visibility</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Who can see your profile photo, bio, and about info
              </p>
              <select
                value={settings.profile_visibility}
                onChange={(e) => setSettings(prev => ({ ...prev, profile_visibility: e.target.value }))}
                className="bg-[#1c1c1e] border border-[#2e2e32] rounded-xl px-4 py-2 text-sm text-white focus:border-gray-500 outline-none transition cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
        </div>

        {/* Read Receipts Toggle */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare size={20} className="text-cyan-400" />
                <h3 className="font-semibold text-base">Read Receipts</h3>
              </div>
              <p className="text-xs text-gray-400">
                Allow others to see when you've read their messages
              </p>
            </div>
            <label className="relative inline-flex h-6 w-12 shrink-0 items-center">
              <input
                type="checkbox"
                checked={settings.read_receipts}
                onChange={(e) => setSettings(prev => ({ ...prev, read_receipts: e.target.checked }))}
                className="sr-only"
              />
              <span
                className={`relative flex h-6 w-12 cursor-pointer items-center rounded-full border border-white/10 transition-all duration-200 overflow-hidden ${
                  settings.read_receipts ? 'bg-emerald-400' : 'bg-[#2e2e32]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
                    settings.read_receipts
                      ? 'translate-x-6 bg-black'
                      : 'translate-x-0 bg-white'
                  }`}
                />
              </span>
            </label>
          </div>
        </div>

        {/* Deactivate Account */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-red-500/20 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={20} className="text-red-400" />
                <h3 className="font-semibold text-base text-red-400">Deactivate Account</h3>
              </div>
              <p className="text-xs text-gray-400">
                Temporarily deactivate your account. Your data will be preserved.
              </p>
            </div>
            <button
              onClick={() => setShowDeactivateModal(true)}
              className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/30 transition"
            >
              Deactivate
            </button>
          </div>
        </div>
      </main>

      {/* Deactivation Modal */}
      {showDeactivateModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeactivateModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="bg-[#141416]/98 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md w-full p-6 animate-modal-fade-in">
              <div className="text-center mb-4">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={28} className="text-red-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Deactivate Account?</h3>
                <p className="text-sm text-gray-400">
                  Your profile, chats, and data will be hidden. You can reactivate anytime by logging back in.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeactivateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivateAccount}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition"
                >
                  Confirm
                </button>
              </div>
            </div>
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
        @keyframes modal-fade-in {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modal-fade-in {
          animation: modal-fade-in 0.3s ease forwards;
        }
      `}</style>
    </div>
  )
}