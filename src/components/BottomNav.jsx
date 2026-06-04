import { useEffect, useMemo, useState } from 'react'
import { Home, Settings, User } from 'react-feather'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/supabase'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userId, setUserId] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      const currentUser = await getCurrentUser()
      if (isMounted) {
        setUserId(currentUser?.id || '')
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [])

  const profilePath = useMemo(() => (userId ? `/profile/${userId}` : '/profile'), [userId])

  const isHome = location.pathname === '/home' || location.pathname.startsWith('/chat/')
  const isSettings = location.pathname === '/settings' || location.pathname.startsWith('/settings/')
  const isProfile = location.pathname === '/profile' || location.pathname.startsWith('/profile/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0a0a]/85 py-2 px-6 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className={`flex flex-col items-center gap-0.5 transition ${isHome ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        >
          <Home size={20} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center gap-0.5 transition ${isSettings ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        >
          <Settings size={20} />
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(profilePath)}
          className={`flex flex-col items-center gap-0.5 transition ${isProfile ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        >
          <User size={20} />
          <span className="text-[10px] mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  )
}
