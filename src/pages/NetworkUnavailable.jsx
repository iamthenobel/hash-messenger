import { WifiOff, RefreshCw, Shield } from 'react-feather'

export default function NetworkUnavailable({ onRetry }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121212]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-emerald-300">
            <WifiOff size={28} />
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Connection lost</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Network unavailable</h1>
          <p className="mt-3 text-sm text-gray-300">
            It looks like your internet connection dropped. Check your network, then retry to continue using Hash.
          </p>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-gray-200">
          <div className="flex items-start gap-3">
            <Shield size={16} className="mt-0.5 text-emerald-300" />
            <span>Your messages and profile data will reconnect automatically once the network returns.</span>
          </div>
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="mt-0.5 text-emerald-300" />
            <span>This page will refresh automatically when internet access is restored.</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    </div>
  )
}
