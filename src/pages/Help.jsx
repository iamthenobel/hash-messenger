import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  FileText,
  Info,
  Star,
  ChevronRight,
  X,
  Copy,
  ExternalLink,
  HelpCircle,
  Twitter,
} from 'react-feather'

export default function HelpFeedback() {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const [activeModal, setActiveModal] = useState(null)

  // Show toast notification
  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 2000)
  }

  // Copy to clipboard
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label} copied to clipboard`)
    } catch (err) {
      showToast('Failed to copy', true)
    }
  }

  // Close modal
  const closeModal = () => {
    setActiveModal(null)
    document.body.style.overflow = ''
  }

  // Open modal
  const openModal = (modalId) => {
    setActiveModal(modalId)
    document.body.style.overflow = 'hidden'
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

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
        <h1 className="text-xl font-semibold tracking-tight">Help & Feedback</h1>
      </header>

      <div className="pt-20" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        
        {/* Contact Us Card */}
        <button
          onClick={() => openModal('contact')}
          className="w-full bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 transition-all hover:bg-[#1c1c20] hover:border-white/10 hover:-translate-y-0.5 animate-fade-in-up"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
              <Mail size={24} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">Contact Us</h3>
              <p className="text-sm text-gray-400 mt-0.5">Get in touch with our support team</p>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </div>
        </button>

        {/* Terms & Privacy Policy Card */}
        <button
          onClick={() => openModal('terms')}
          className="w-full bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 transition-all hover:bg-[#1c1c20] hover:border-white/10 hover:-translate-y-0.5 animate-fade-in-up"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
              <FileText size={24} className="text-emerald-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">Terms & Privacy Policy</h3>
              <p className="text-sm text-gray-400 mt-0.5">Legal agreements and data handling</p>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </div>
        </button>

        {/* App Information Card */}
        <button
          onClick={() => openModal('appInfo')}
          className="w-full bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 transition-all hover:bg-[#1c1c20] hover:border-white/10 hover:-translate-y-0.5 animate-fade-in-up"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
              <Info size={24} className="text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">App Information</h3>
              <p className="text-sm text-gray-400 mt-0.5">Version, licenses, and credits</p>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </div>
        </button>

        {/* Rate Hash Card */}
        <div className="bg-[#121212]/70 backdrop-blur-sm border border-white/5 rounded-2xl p-5 mt-4 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
              <Star size={24} className="text-amber-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">Rate Hash</h3>
              <p className="text-sm text-gray-400 mt-0.5">Love the app? Leave a review</p>
            </div>
            <button
              onClick={() => showToast('Thanks for rating Hash!')}
              className="px-4 py-1.5 rounded-full bg-white/10 text-sm font-medium hover:bg-white/20 transition"
            >
              Rate
            </button>
          </div>
        </div>
      </main>

      {/* Contact Modal */}
      {activeModal === 'contact' && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="bg-[#141416]/98 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md w-full p-6 animate-modal-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Contact Support</h3>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                We're here to help. Choose your preferred contact method:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => copyToClipboard('support@hash.com', 'Email address')}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition"
                >
                  <Mail size={20} className="text-blue-400" />
                  <span className="flex-1 text-left">iamtheboss357286@gmail.com</span>
                  <Copy size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => {
                    window.open('https://twitter.com/HashSupport', '_blank')
                    showToast('Opening Twitter...')
                  }}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition"
                >
                  <Twitter size={20} className="text-sky-400" />
                  <span className="flex-1 text-left">@HashSupport</span>
                  <ExternalLink size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => showToast('Opening Knowledge Base (demo)')}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition"
                >
                  <HelpCircle size={20} className="text-emerald-400" />
                  <span className="flex-1 text-left">FAQ & Knowledge Base</span>
                  <ChevronRight size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Terms Modal */}
      {activeModal === 'terms' && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="bg-[#141416]/98 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto animate-modal-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Terms & Privacy</h3>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h4 className="font-semibold text-white mb-1">Terms of Service</h4>
                  <p>
                    By using Hash, you agree to our terms. We provide end-to-end encrypted 
                    messaging with zero data selling.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Privacy Policy</h4>
                  <p>
                    We collect minimal data: only your profile info. Messages are encrypted 
                    and never stored on our servers longer than necessary.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Data Deletion</h4>
                  <p>
                    You can request full data deletion via Settings → Account → Delete Account.
                  </p>
                </div>
                <button
                  onClick={() => showToast('Full policy document (demo)')}
                  className="w-full mt-2 py-2 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/20 transition"
                >
                  View Full Policy →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* App Info Modal */}
      {activeModal === 'appInfo' && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="bg-[#141416]/98 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md w-full p-6 animate-modal-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">App Information</h3>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Version</span>
                  <span className="font-medium">1.0.0 (build 001)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Released</span>
                  <span className="font-medium">June 2026</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Compatibility</span>
                  <span className="font-medium">Web · iOS · Android</span>
                </div>
                <div className="py-2">
                  <span className="text-gray-400 block mb-2">Built With</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10">React</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10">Supabase</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10">Tailwind CSS</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10">Feather Icons</span>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-gray-500 text-center">
                    © 2026 Hash — Secure messaging reimagined
                  </p>
                </div>
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