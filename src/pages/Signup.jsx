import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  User,
  AtSign,
  Mail,
  Calendar,
  Lock,
  Camera,
  UploadCloud,
  CheckCircle,
} from 'react-feather'

import {
  signUpWithEmail,
  checkUsernameAvailability,
  createUserProfile,
  uploadAvatar,
} from '../services/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    dob: '',
    password: '',
    confirmPassword: '',
  })

  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  function updateField(key, value) {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  function validateStep() {
    setError('')

    if (step === 1) {
      if (form.fullName.trim().length < 2) {
        setError('Full name must be at least 2 characters')
        return false
      }
      if (form.fullName.trim().length > 50) {
        setError('Full name is too long')
        return false
      }
    }

    if (step === 2) {
      const regex = /^[a-zA-Z0-9_]{3,20}$/
      if (!regex.test(form.username)) {
        setError('Username must be 3-20 characters (letters, numbers, underscore)')
        return false
      }
    }

    if (step === 3) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.email)) {
        setError('Please enter a valid email address')
        return false
      }
    }

    if (step === 4) {
      if (!form.dob) {
        setError('Please enter your date of birth')
        return false
      }
      
      const birth = new Date(form.dob)
      const today = new Date()
      
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      
      if (age < 13) {
        setError('You must be at least 13 years old')
        return false
      }
      
      if (age > 120) {
        setError('Please enter a valid date of birth')
        return false
      }
    }

    if (step === 5) {
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters')
        return false
      }
      
      if (form.password.length > 50) {
        setError('Password is too long')
        return false
      }
      
      if (!/(?=.*[A-Z])/.test(form.password)) {
        setError('Password must contain at least one uppercase letter')
        return false
      }
      
      if (!/(?=.*[0-9])/.test(form.password)) {
        setError('Password must contain at least one number')
        return false
      }
      
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match')
        return false
      }
    }

    return true
  }

  async function nextStep() {
    if (!validateStep()) return

    if (step === 5) {
      const isAvailable = await checkUsernameAvailability(form.username)
      if (!isAvailable) {
        setError('Username is already taken')
        return
      }
    }

    setStep(prev => prev + 1)
  }

  function prevStep() {
    setError('')
    setStep(prev => prev - 1)
  }

  async function onFormKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (step !== 6) {
      await nextStep()
    } else {
      await handleSubmit()
    }
  }

  function handleAvatar(e) {
    const file = e.target.files[0]
    if (!file) return
    
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image (JPEG, PNG, WEBP)')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }
    
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault()

    if (step !== 6) {
      setError('Please complete all steps and click Create Account on the final step.')
      return
    }

    let userId = null
    let avatarPath = ''

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Step 1: Create auth user
      const { data, error: signUpError } = await signUpWithEmail(
        form.email.trim(),
        form.password,
        {
          data: {
            full_name: form.fullName.trim(),
            username: form.username.toLowerCase(),
            dob: form.dob,
          },
        }
      )

      if (signUpError) {
        throw signUpError
      }

      if (!data?.user?.id) {
        throw new Error('Unable to create user account')
      }

      userId = data.user.id

      // Step 2: Upload avatar if provided
      if (avatar) {
        try {
          avatarPath = await uploadAvatar(userId, avatar)
        } catch (avatarErr) {
          console.warn('Avatar upload failed, continuing without avatar:', avatarErr)
          avatarPath = ''
        }
      }

      // Step 3: Create profile (with retry logic)
      let profileCreated = false
      let retries = 0
      const maxRetries = 5

      while (!profileCreated && retries < maxRetries) {
        try {
          // Wait a bit for the user to be fully created in auth system
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries))
          }
          
          const { error: profileError } = await createUserProfile({
            id: userId,
            full_name: form.fullName.trim(),
            username: form.username.toLowerCase(),
            email: form.email.toLowerCase(),
            dob: form.dob,
            avatar: avatarPath,
            status: 'online',
          })

          if (profileError) {
            // If error is about user not found, retry
            if (profileError.message?.includes('foreign key') || 
                profileError.message?.includes('violates foreign key')) {
              retries++
              console.log(`Retrying profile creation (attempt ${retries}/${maxRetries})...`)
              continue
            }
            throw profileError
          }
          
          profileCreated = true
        } catch (err) {
          if (retries >= maxRetries - 1) throw err
          retries++
        }
      }

      // Step 4: Show success message
      if (data.session) {
        setSuccess('Account created successfully! Redirecting to login...')
      } else {
        setSuccess('Account created! Please check your email to confirm your account before logging in.')
      }

      // Clear any signup data from localStorage
      localStorage.removeItem('hash_signup_profile')

      // Redirect after delay
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)

    } catch (err) {
      console.error('Signup error:', err)

      let errorMessage = 'Signup failed. Please try again.'
      
      if (err.message) {
        if (err.message.toLowerCase().includes('already exists') || 
            err.message.toLowerCase().includes('duplicate')) {
          errorMessage = 'Email or username already registered. Please use another email or login.'
        } else if (err.message.toLowerCase().includes('invalid')) {
          errorMessage = 'Invalid information provided. Please check your details.'
        } else if (err.message.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Please check your connection.'
        } else if (err.message.toLowerCase().includes('database error')) {
          errorMessage = 'Unable to complete signup. Please try again in a moment.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      
      // Cleanup: If user was created but profile failed, attempt to clean up
      if (userId && !success) {
        console.log('Profile creation failed, user may need manual cleanup:', userId)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-5 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            <div className="bg-[#252525] p-2 rounded-2xl">
              <MessageCircle size={20} />
            </div>
            <h1 className="text-2xl font-semibold">
              Hash.
            </h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-400 flex items-center gap-2 hover:text-white transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="bg-[#141414]/80 border border-white/5 backdrop-blur-xl rounded-[35px] p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-5xl font-bold leading-tight">
                Create
                <br />
                account
              </h2>
              <p className="text-gray-500 mt-4">
                Secure. Private. Fast.
              </p>
              <div className="flex items-center gap-3 mt-10">
                {[1,2,3,4,5,6].map(item => (
                  <div
                    key={item}
                    className={`
                      h-2 rounded-full transition-all duration-300
                      ${step >= item
                        ? 'bg-white w-12'
                        : 'bg-white/10 w-8'
                      }
                    `}
                  />
                ))}
              </div>
            </div>

            <form onKeyDown={onFormKeyDown} className="space-y-6">
              {step === 1 && (
                <Input
                  icon={<User size={18} />}
                  placeholder="Full Name"
                  value={form.fullName}
                  onChange={e => updateField('fullName', e.target.value)}
                  autoFocus
                />
              )}

              {step === 2 && (
                <Input
                  icon={<AtSign size={18} />}
                  placeholder="Username"
                  value={form.username}
                  onChange={e => updateField('username', e.target.value)}
                  autoFocus
                />
              )}

              {step === 3 && (
                <Input
                  icon={<Mail size={18} />}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  autoFocus
                />
              )}

              {step === 4 && (
                <Input
                  icon={<Calendar size={18} />}
                  type="date"
                  value={form.dob}
                  onChange={e => updateField('dob', e.target.value)}
                  autoFocus
                />
              )}

              {step === 5 && (
                <>
                  <Input
                    icon={<Lock size={18} />}
                    placeholder="Password"
                    type="password"
                    value={form.password}
                    onChange={e => updateField('password', e.target.value)}
                    autoFocus
                  />
                  <Input
                    icon={<Lock size={18} />}
                    placeholder="Confirm Password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => updateField('confirmPassword', e.target.value)}
                  />
                </>
              )}

              {step === 6 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-5">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-[#252525] border border-white/10 flex items-center justify-center">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          className="w-full h-full object-cover"
                          alt="Avatar preview"
                        />
                      ) : (
                        <Camera size={30} className="text-gray-400" />
                      )}
                    </div>
                    <label className="cursor-pointer border border-dashed border-white/20 px-6 py-4 rounded-2xl w-full text-center hover:bg-white/5 transition group">
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatar}
                      />
                      <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-white transition">
                        <UploadCloud size={18} />
                        Upload Avatar (Optional)
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-emerald-400 text-sm text-center">{success}</p>
                </div>
              )}

              <div className="flex gap-4 pt-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-white/10 rounded-2xl hover:bg-white/5 transition"
                  >
                    Back
                  </button>
                )}
                
                {step < 6 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 py-3 bg-white text-black rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition"
                  >
                    Continue
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-3 bg-white text-black rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <CheckCircle size={18} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function Input({ icon, ...props }) {
  return (
    <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/5 rounded-2xl px-5 py-4 focus-within:border-white/20 transition">
      <div className="text-gray-500">
        {icon}
      </div>
      <input
        {...props}
        className="bg-transparent outline-none w-full text-white placeholder:text-gray-500"
      />
    </div>
  )
}