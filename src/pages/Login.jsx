import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'react-feather'

import { signInWithEmail, ensureUserProfile } from '../services/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('hash_remember_email')
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await signInWithEmail(
        email.trim(),
        password
      )

      if (error) throw error

      if (!data?.session) {
        setError('Check your email for confirmation, then sign in.')
        setLoading(false)
        return
      }

      const user = data.user || data.session?.user
      let storedSignupProfile = null

      if (typeof window !== 'undefined') {
        const rawProfile = localStorage.getItem('hash_signup_profile')
        if (rawProfile) {
          try {
            storedSignupProfile = JSON.parse(rawProfile)
          } catch {}
        }
      }

      try {
        if (user) {
          await ensureUserProfile(user, storedSignupProfile)
        }
      } catch (profileErr) {
        console.warn('Unable to ensure user profile:', profileErr)
      }

      try {
        localStorage.setItem('hash_user_email', email.trim().toLowerCase())
      } catch {}

      if (remember) {
        localStorage.setItem('hash_remember_email', email.trim())
      } else {
        localStorage.removeItem('hash_remember_email')
      }

      navigate('/home')
    } catch (err) {
      console.error('Login error:', err)
      const msg = (err?.message || 'Invalid email or password').toLowerCase()
      if (msg.includes('invalid')) {
        setError('Invalid credentials')
      } else {
        setError(err?.message || 'Sign in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-[#252525] p-2 rounded-2xl">
              <Mail size={20} />
            </div>
            <span className="text-2xl font-semibold">Hash.</span>
          </div>
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2">
            <ArrowLeft size={16} />
            Home
          </Link>
        </div>

        <div className="bg-[#141414]/80 backdrop-blur-xl border border-white/5 rounded-[35px] p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <CheckCircle size={26} />
            </div>
            <h1 className="text-4xl font-bold">Welcome back</h1>
            <p className="text-gray-400 mt-2">Sign in to continue to Hash</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />

            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRemember(r => !r)} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${remember ? 'bg-white text-black' : 'border-white/20'}`}>
                  {remember && <div className="w-3 h-3 bg-black rounded" />}
                </div>
                <span className="text-sm text-gray-400">Remember me</span>
              </button>

              <button type="button" className="text-sm text-gray-400 hover:text-white">Forgot password?</button>
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button disabled={loading} className="w-full py-3.5 rounded-xl bg-white text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Signing In...' : 'Sign In'}
              <CheckCircle size={18} />
            </button>

            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-sm text-gray-400">
                Don't have an account?
                <Link to="/signup" className="text-white ml-1">Create account</Link>
              </p>
            </div>
          </form>
        </div>

        <div className="mt-8 space-y-2 text-[11px] text-gray-500">
          <div className="flex justify-center items-center gap-2">
            <Mail size={12} />
            End-to-end encrypted
          </div>
          <div className="flex justify-center items-center gap-2">
            <Lock size={12} />
            Real-time sync
          </div>
        </div>
      </div>
    </div>
  )
}

function Input(props) {
  return (
    <div className="flex items-center gap-3 bg-[#1c1c1e] border border-[#2e2e32] rounded-[18px] px-5 py-4 outline-none focus-within:border-[#6b6b70] transition">
      <input {...props} className="w-full bg-transparent outline-none text-white placeholder:text-gray-500" />
    </div>
  )
}
