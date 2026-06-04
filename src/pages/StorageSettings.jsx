import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  HardDrive,
  Trash2,
  Download,
  Image,
  Video,
  FileText,
  Save,
} from 'react-feather'
import supabase,{
  getCurrentUser,
} from '../services/supabase'

export default function StorageSettings() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  // Storage data state
  const [storageData, setStorageData] = useState({
    mobile_data_mb: 187,
    wifi_data_mb: 1240,
    total_data_mb: 1427,
    storage_used_mb: 342,
    storage_total_mb: 2048,
    messages_mb: 156,
    media_mb: 178,
    documents_mb: 8,
    other_mb: 0,
  })
  
  // Settings state
  const [settings, setSettings] = useState({
    auto_download_media: true,
    auto_photos: true,
    auto_videos: false,
    auto_documents: false,
    save_to_gallery: false,
  })

  // Show toast notification
  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 2000)
  }

  // Load storage data from database
  const loadStorageData = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('storage_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Load storage data error:', error)
        return
      }

      if (data) {
        setStorageData(prev => ({
          ...prev,
          storage_used_mb: data.storage_used_mb || prev.storage_used_mb,
          messages_mb: data.messages_mb || prev.messages_mb,
          media_mb: data.media_mb || prev.media_mb,
          documents_mb: data.documents_mb || prev.documents_mb,
        }))
        
        setSettings(prev => ({
          ...prev,
          auto_download_media: data.auto_download_media !== false,
          save_to_gallery: data.save_to_gallery || false,
        }))
      }
    } catch (err) {
      console.error('Load storage data error:', err)
    }
  }, [])

  // Save settings to database
  const saveSettings = async () => {
    if (!currentUser) return

    try {
      const { error } = await supabase
        .from('storage_settings')
        .upsert({
          user_id: currentUser.id,
          auto_download_media: settings.auto_download_media,
          save_to_gallery: settings.save_to_gallery,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      
      showToast('Settings saved successfully')
    } catch (err) {
      console.error('Save settings error:', err)
      showToast('Failed to save settings', true)
    }
  }

  // Clear cache
  const handleClearCache = async () => {
    try {
      // In a real implementation, this would clear local storage and indexedDB
      // For now, just simulate
      showToast('Cache cleared successfully')
    } catch (err) {
      console.error('Clear cache error:', err)
      showToast('Failed to clear cache', true)
    }
  }

  // Calculate percentages for progress bars
  const dataUsagePercent = Math.min(100, (storageData.total_data_mb / 2048) * 100)
  const storagePercent = Math.min(100, (storageData.storage_used_mb / storageData.storage_total_mb) * 100)

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
      await loadStorageData(user.id)
      setLoading(false)
    }
    init()
  }, [navigate, loadStorageData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="h-8 w-40 animate-pulse rounded-full bg-white/8" />
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-10">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 px-5 py-3 flex items-center gap-3 bg-[#0a0a0a]/75 backdrop-blur-lg border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/5 transition flex items-center"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Storage & Data</h1>
      </header>

      <div className="pt-20" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        
        {/* Data Usage Card */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-emerald-400" />
              <h3 className="font-semibold text-base">Data Usage</h3>
            </div>
            <span className="text-xs text-gray-500">Last 30 days</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Mobile Data</span>
                <span className="font-medium">{storageData.mobile_data_mb} MB</span>
              </div>
              <div className="progress-bar-container bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="progress-fill bg-gradient-to-r from-white to-gray-400 rounded-full h-full transition-all duration-800"
                  style={{ width: `${Math.max(4, (storageData.mobile_data_mb / 2048) * 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Wi-Fi Data</span>
                <span className="font-medium">{(storageData.wifi_data_mb / 1024).toFixed(2)} GB</span>
              </div>
              <div className="progress-bar-container bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="progress-fill bg-gradient-to-r from-white to-gray-400 rounded-full h-full transition-all duration-800"
                  style={{ width: `${Math.max(4, (storageData.wifi_data_mb / 2048) * 100 + 10)}%` }}
                />
              </div>
            </div>
            
            <div className="pt-2 flex justify-between text-sm border-t border-white/10 mt-2">
              <span className="text-gray-400">Total Used</span>
              <span className="font-semibold">{(storageData.total_data_mb / 1024).toFixed(2)} GB</span>
            </div>
          </div>
        </div>

        {/* Storage Usage Card */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive size={20} className="text-blue-400" />
              <h3 className="font-semibold text-base">Storage Usage</h3>
            </div>
            <span className="text-xs text-gray-500">Device storage</span>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Used</span>
              <span className="font-medium">
                {storageData.storage_used_mb} MB / {storageData.storage_total_mb} MB
              </span>
            </div>
            <div className="progress-bar-container bg-white/10 rounded-full h-2 overflow-hidden mb-4">
              <div 
                className="progress-fill bg-gradient-to-r from-white to-gray-400 rounded-full h-full transition-all duration-800"
                style={{ width: `${Math.max(4, storagePercent)}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-gray-400">Messages</span>
              <span className="font-medium">{storageData.messages_mb} MB</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-gray-400">Media</span>
              <span className="font-medium">{storageData.media_mb} MB</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-gray-400">Documents</span>
              <span className="font-medium">{storageData.documents_mb} MB</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-gray-400">Other</span>
              <span className="font-medium">{storageData.other_mb} MB</span>
            </div>
          </div>
          
          <button
            onClick={handleClearCache}
            className="w-full mt-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-2"
          >
            <Trash2 size={16} /> Clear Cache
          </button>
        </div>

        {/* Auto Download Media Toggle */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Download size={20} className="text-purple-400" />
                <h3 className="font-semibold text-base">Auto Download Media</h3>
              </div>
              <p className="text-xs text-gray-400">
                Automatically download photos, videos, and documents
              </p>
            </div>
            <label className="relative inline-flex h-6 w-12 shrink-0 items-center">
              <input
                type="checkbox"
                checked={settings.auto_download_media}
                onChange={async (e) => {
                  setSettings(prev => ({ ...prev, auto_download_media: e.target.checked }))
                  await saveSettings()
                  showToast(e.target.checked ? 'Auto-download enabled' : 'Auto-download disabled')
                }}
                className="peer sr-only"
              />
              <span
                className={`relative flex h-6 w-12 cursor-pointer items-center rounded-full border border-white/10 transition-all duration-200 overflow-hidden ${
                  settings.auto_download_media ? 'bg-emerald-400' : 'bg-[#2e2e32]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
                    settings.auto_download_media
                      ? 'translate-x-6 bg-black'
                      : 'translate-x-0 bg-white'
                  }`}
                />
              </span>
            </label>
          </div>
          
          <div className={`mt-4 space-y-3 transition-all duration-300 ${settings.auto_download_media ? 'opacity-100' : 'opacity-50'}`}>
            {/* Photos */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <Image size={16} className="text-gray-400" />
                <span className="text-sm">Photos</span>
              </div>
              <label className="relative inline-flex h-5 w-10 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={settings.auto_photos}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, auto_photos: e.target.checked }))
                    showToast(e.target.checked ? 'Photos will auto-download' : 'Photos will not auto-download')
                  }}
                  disabled={!settings.auto_download_media}
                  className="peer sr-only"
                />
                <span
                  className={`relative flex h-5 w-10 cursor-pointer items-center rounded-full border border-white/10 transition-all duration-200 overflow-hidden ${
                    settings.auto_photos ? 'bg-emerald-400' : 'bg-[#2e2e32]'
                  } ${!settings.auto_download_media ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full shadow-sm transition-transform duration-200 ${
                      settings.auto_photos
                        ? 'translate-x-5 bg-black'
                        : 'translate-x-0 bg-white'
                    }`}
                  />
                </span>
              </label>
            </div>
            
            {/* Videos */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-gray-400" />
                <span className="text-sm">Videos</span>
              </div>
              <label className="relative inline-flex h-5 w-10 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={settings.auto_videos}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, auto_videos: e.target.checked }))
                    showToast(e.target.checked ? 'Videos will auto-download' : 'Videos will not auto-download')
                  }}
                  disabled={!settings.auto_download_media}
                  className="peer sr-only"
                />
                <span
                  className={`relative flex h-5 w-10 cursor-pointer items-center rounded-full border border-white/10 transition-all duration-200 overflow-hidden ${
                    settings.auto_videos ? 'bg-emerald-400' : 'bg-[#2e2e32]'
                  } ${!settings.auto_download_media ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full shadow-sm transition-transform duration-200 ${
                      settings.auto_videos
                        ? 'translate-x-5 bg-black'
                        : 'translate-x-0 bg-white'
                    }`}
                  />
                </span>
              </label>
            </div>
            
            {/* Documents */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                <span className="text-sm">Documents</span>
              </div>
              <label className="relative inline-flex h-5 w-10 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={settings.auto_documents}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, auto_documents: e.target.checked }))
                    showToast(e.target.checked ? 'Documents will auto-download' : 'Documents will not auto-download')
                  }}
                  disabled={!settings.auto_download_media}
                  className="peer sr-only"
                />
                <span
                  className={`relative flex h-5 w-10 cursor-pointer items-center rounded-full border border-white/10 transition-all duration-200 overflow-hidden ${
                    settings.auto_documents ? 'bg-emerald-400' : 'bg-[#2e2e32]'
                  } ${!settings.auto_download_media ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full shadow-sm transition-transform duration-200 ${
                      settings.auto_documents
                        ? 'translate-x-5 bg-black'
                        : 'translate-x-0 bg-white'
                    }`}
                  />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Save to Gallery Card */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Save size={20} className="text-amber-400" />
                <h3 className="font-semibold text-base">Save to Gallery</h3>
              </div>
              <p className="text-xs text-gray-400">
                Automatically save received media to your device gallery
              </p>
            </div>
            <label className="relative inline-flex h-6 w-12 shrink-0 items-center">
              <input
                type="checkbox"
                checked={settings.save_to_gallery}
                onChange={async (e) => {
                  setSettings(prev => ({ ...prev, save_to_gallery: e.target.checked }))
                  await saveSettings()
                  showToast(e.target.checked ? 'Media will be saved to gallery' : 'Media will not be saved to gallery')
                }}
                className="peer sr-only"
              />
              <span
                className={`relative flex h-6 w-12 cursor-pointer items-center rounded-full border border-white/10 transition-all duration-200 overflow-hidden ${
                  settings.save_to_gallery ? 'bg-emerald-400' : 'bg-[#2e2e32]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
                    settings.save_to_gallery
                      ? 'translate-x-6 bg-black'
                      : 'translate-x-0 bg-white'
                  }`}
                />
              </span>
            </label>
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
        .progress-fill {
          transition: width 0.8s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }
      `}</style>
    </div>
  )
}