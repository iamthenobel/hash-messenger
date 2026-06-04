import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Mail, User, Shield } from 'react-feather'
import { getCurrentUser, getUserProfile } from '../services/supabase'

export default function OtherUserProfile() {
  const navigate = useNavigate()
  const { chatId, userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        navigate('/login', { replace: true })
        return
      }

      const targetProfile = await getUserProfile(userId)
      setProfile(targetProfile)
    } catch (err) {
      console.error('Load other user profile error:', err)
    } finally {
      setLoading(false)
    }
  }, [navigate, userId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const formatDate = (value) => {
    if (!value) return 'Not set'
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="h-8 w-36 animate-pulse rounded-full bg-white/8" />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-white/8" />
            <div className="mx-auto mt-4 h-4 w-32 animate-pulse rounded-full bg-white/8" />
            <div className="mx-auto mt-3 h-3 w-24 animate-pulse rounded-full bg-white/8" />
          </div>
          <div className="h-24 animate-pulse rounded-3xl bg-white/8" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      <header className="fixed top-0 w-full z-40 px-4 py-3 flex items-center justify-between bg-[#0a0a0a]/85 backdrop-blur-lg border-b border-white/5">
        <button
          onClick={() => navigate(chatId ? `/chat/${chatId}` : '/home')}
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/5 transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to chat</span>
        </button>
      </header>

      <div className="pt-20" />

      <main className="max-w-2xl mx-auto px-4 space-y-6">
        <section className="rounded-3xl border border-white/8 bg-[#121212]/80 p-6 text-center shadow-2xl">
          <img
            src={profile?.avatar || `https://ui-avatars.com/api/?background=252525&color=fff&name=${encodeURIComponent(profile?.full_name || 'User')}`}
            alt={profile?.full_name || 'Profile'}
            className="mx-auto h-24 w-24 rounded-full border border-white/10 object-cover shadow-xl"
          />
          <h1 className="mt-4 text-2xl font-semibold">{profile?.full_name || 'Anonymous User'}</h1>
          <p className="text-sm text-gray-400">@{profile?.username || 'username'}</p>
          <p className="mt-3 text-sm text-gray-300">{profile?.bio || 'No bio added yet.'}</p>
        </section>

        <section className="rounded-3xl border border-white/8 bg-[#121212]/80 p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <h2 className="text-base font-semibold">Profile details</h2>
            <User size={16} className="text-gray-500" />
          </div>

          <div className="grid gap-3 text-sm text-gray-200">
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
              <Mail size={16} className="text-gray-400" />
              <span className="truncate">{profile?.email || 'No email on file'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
              <Calendar size={16} className="text-gray-400" />
              <span>Joined {formatDate(profile?.created_at)}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
              <Shield size={16} className="text-gray-400" />
              <span>Status: {profile?.status || 'online'}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
