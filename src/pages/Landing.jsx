import { useEffect, useState } from 'react'
import { Link } from "react-router-dom";

import {
  MessageCircle,
  UserPlus,
  LogIn,
  CheckCircle,
  Shield,
  Users,
  MoreVertical,
  Smile,
  Send,
  Zap,
  Lock,
  MessageSquare,
  Globe,
  GitMerge,
  Video,
  Sun,
  Smartphone,
  Play,
  Clock,
  BatteryCharging,
  FileText,
  Download,
  Mail,
  Twitter,
  Instagram,
  GitHub,
  Facebook,
  Menu,
  X,
} from 'react-feather'

export default function Landing() {

  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {

    const revealElements = document.querySelectorAll('.reveal')

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {

        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }

      })
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    })

    revealElements.forEach(el => observer.observe(el))

    const nav = document.querySelector('nav')

    const handleScroll = () => {

      if (window.scrollY > 40) {
        nav?.classList.add('nav-scrolled')
      } else {
        nav?.classList.remove('nav-scrolled')
      }

    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }

  }, [])

  return (

    <div className="bg-[#0a0a0a] text-white overflow-x-hidden">

      <style>{`

        html{
          scroll-behavior:smooth;
        }

        body{
          font-family:Inter,system-ui,sans-serif;
          background:#0a0a0a;
        }

        .gradient-text{
          background:linear-gradient(135deg,#fff 0%,#999 100%);
          -webkit-background-clip:text;
          color:transparent;
        }

        .glass{
          background:rgba(20,20,20,.6);
          backdrop-filter:blur(18px);
          border:1px solid rgba(255,255,255,.06);
        }

        .glass-card{
          background:rgba(30,30,30,.65);
          backdrop-filter:blur(16px);
          border:1px solid rgba(255,255,255,.07);
        }

        .hover-card{
          transition:.35s ease;
        }

        .hover-card:hover{
          transform:translateY(-6px);
          border-color:rgba(255,255,255,.15);
          box-shadow:0 15px 50px rgba(255,255,255,.04);
        }

        .message-left{
          background:#252525;
          border-radius:24px 24px 24px 8px;
        }

        .message-right{
          background:#323232;
          border-radius:24px 24px 8px 24px;
        }

        .reveal{
          opacity:0;
          transform:translateY(40px);
          transition:
          opacity .8s cubic-bezier(.2,.8,.2,1),
          transform .8s cubic-bezier(.2,.8,.2,1);
        }

        .reveal.visible{
          opacity:1;
          transform:translateY(0);
        }

        .floating{
          animation:float 6s ease-in-out infinite;
        }

        @keyframes float{
          0%{transform:translateY(0px);}
          50%{transform:translateY(-12px);}
          100%{transform:translateY(0px);}
        }

        .glow{
          position:absolute;
          width:500px;
          height:500px;
          background:radial-gradient(circle,rgba(255,255,255,.07),transparent 70%);
          filter:blur(40px);
          z-index:0;
        }

        .nav-scrolled{
          background:rgba(0,0,0,.75)!important;
          backdrop-filter:blur(24px);
          border-bottom:1px solid rgba(255,255,255,.08);
        }

        .custom-scroll::-webkit-scrollbar{
          width:4px;
        }

        .custom-scroll::-webkit-scrollbar-thumb{
          background:#444;
          border-radius:10px;
        }

      `}</style>

      <div className="glow top-[-200px] left-[-120px]"></div>
      <div className="glow bottom-[-250px] right-[-120px]"></div>

      <nav className="fixed top-0 left-0 w-full z-50 transition-all duration-300 glass">

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">

          <div className="flex items-center gap-2 cursor-pointer">

            <div className="bg-white/10 p-2 rounded-2xl">
              <MessageCircle size={20} />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Hash<span className="text-gray-500">.</span>
            </h1>

          </div>

          <div className="hidden md:flex items-center gap-10 text-sm text-gray-300">

            <a href="#home" className="hover:text-white transition">
              Home
            </a>

            <a href="#features" className="hover:text-white transition">
              Features
            </a>

            <a href="#stats" className="hover:text-white transition">
              Stats
            </a>

            <a href="#footer" className="hover:text-white transition">
              Contact
            </a>

          </div>

          <div className="hidden md:flex items-center gap-3">

            <Link
  to="/login"
  className="px-5 py-2 rounded-full border border-white/10 hover:bg-white/5 transition inline-block"
>
  Login
</Link>

<Link
  to="/signup"
  className="px-5 py-2 rounded-full bg-white text-black font-semibold hover:scale-105 transition inline-block"
>
  Sign Up
</Link>

          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {
              mobileMenu
              ? <X />
              : <Menu />
            }
          </button>

        </div>

        {
          mobileMenu && (

            <div className="md:hidden border-t border-white/5 bg-black/90 backdrop-blur-xl">

              <div className="flex flex-col p-6 gap-5 text-gray-300">

                <a href="#home">Home</a>
                <a href="#features">Features</a>
                <a href="#stats">Stats</a>
                <a href="#footer">Contact</a>

                <Link
                  to="/login"
                  className="w-full py-3 rounded-xl border border-white/10 text-center"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold text-center"
                >
                  Sign Up
                </Link>

              </div>

            </div>

          )
        }

      </nav>

      <main className="relative z-10">

        <section
          id="home"
          className="min-h-screen flex items-center px-6 md:px-12 pt-28"
        >

          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">

            <div className="space-y-8 reveal">

              <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">

                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>

                <span className="text-xs uppercase tracking-widest text-gray-300">
                  encrypted messaging
                </span>

              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">

                Future of
                <br />

                <span className="gradient-text">
                  communication
                </span>

              </h1>

              <p className="text-gray-400 text-lg leading-relaxed max-w-xl">

                Ultra-fast messaging with modern realtime architecture,
                beautiful UI, zero tracking, encrypted conversations,
                smart syncing, and seamless collaboration.

              </p>

              <div className="flex flex-wrap gap-4">

                <button className="px-8 py-4 bg-white text-black rounded-2xl font-semibold flex items-center gap-2 hover:scale-105 transition">

                  <UserPlus size={18} />

                  Get Started

                </button>

                <button className="px-8 py-4 border border-white/10 bg-white/5 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition">

                  <LogIn size={18} />

                  Login

                </button>

              </div>

              <div className="flex flex-wrap gap-5 text-sm text-gray-500">

                <span className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  realtime sync
                </span>

                <span className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-400" />
                  encrypted
                </span>

                <span className="flex items-center gap-2">
                  <Zap size={16} className="text-yellow-400" />
                  blazing fast
                </span>

              </div>

            </div>

            <div className="relative reveal floating">

              <div className="glass-card rounded-[35px] p-4 shadow-2xl">

                <div className="flex items-center justify-between border-b border-white/5 pb-4">

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-800 flex items-center justify-center">
                      <Users size={18} />
                    </div>

                    <div>

                      <h3 className="font-medium">
                        Design Team
                      </h3>

                      <p className="text-xs text-gray-400">
                        online now
                      </p>

                    </div>

                  </div>

                  <MoreVertical size={18} className="text-gray-400" />

                </div>

                <div className="space-y-4 py-6 h-[400px] overflow-y-auto custom-scroll">

                  <div className="flex justify-start">
                    <div className="message-left px-5 py-3 max-w-[80%] text-sm">
                      Hash UI looks insanely smooth 🔥
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="message-right px-5 py-3 max-w-[80%] text-sm">
                      realtime performance is crazy fast
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="message-left px-5 py-3 max-w-[80%] text-sm">
                      file upload + encryption finished
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="message-right px-5 py-3 max-w-[80%] text-sm">
                      deploying tonight 🚀
                    </div>
                  </div>

                </div>

                <div className="border border-white/5 bg-black/20 rounded-2xl p-3 flex items-center gap-3">

                  <Smile size={18} className="text-gray-400" />

                  <input
                    disabled
                    placeholder="Type a message..."
                    className="bg-transparent outline-none flex-1 text-sm"
                  />

                  <Send size={18} className="rotate-12 text-white/70" />

                </div>

              </div>

            </div>

          </div>

        </section>

        <section
          id="features"
          className="py-24 px-6 md:px-12"
        >

          <div className="max-w-7xl mx-auto">

            <div className="text-center mb-16 reveal">

              <p className="text-sm uppercase tracking-[4px] text-gray-500">
                Core Features
              </p>

              <h2 className="text-4xl md:text-6xl font-bold mt-4">

                Built for
                <span className="gradient-text">
                  {" "}modern messaging
                </span>

              </h2>

            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">

              {
                [
                  {
                    icon: MessageSquare,
                    title: 'Realtime Chat',
                    text: 'Instant messaging with presence and typing indicators.'
                  },
                  {
                    icon: Shield,
                    title: 'End-to-End Encryption',
                    text: 'Private communication secured across all devices.'
                  },
                  {
                    icon: Globe,
                    title: 'Cross Platform',
                    text: 'Works seamlessly on web, mobile and desktop.'
                  },
                  {
                    icon: GitMerge,
                    title: 'AI Smart Replies',
                    text: 'Generate contextual responses instantly.'
                  },
                  {
                    icon: Video,
                    title: 'Crystal Calls',
                    text: 'Ultra clear voice and video meetings.'
                  },
                  {
                    icon: Sun,
                    title: 'Dynamic Themes',
                    text: 'Minimal adaptive dark mode interface.'
                  }
                ].map((item, index) => (

                  <div
                    key={index}
                    className="glass-card hover-card rounded-3xl p-7 reveal"
                  >

                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">

                      <item.icon size={24} />

                    </div>

                    <h3 className="text-2xl font-semibold mb-3">
                      {item.title}
                    </h3>

                    <p className="text-gray-400 leading-relaxed">
                      {item.text}
                    </p>

                  </div>

                ))
              }

            </div>

          </div>

        </section>

        <section
          id="stats"
          className="py-24 px-6 md:px-12"
        >

          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-7 reveal">

              <h2 className="text-4xl md:text-6xl font-bold leading-tight">

                Messaging without
                <span className="gradient-text">
                  {" "}compromise
                </span>

              </h2>

              <p className="text-gray-400 text-lg leading-relaxed">

                Designed for speed, simplicity, scalability, and secure
                realtime communication infrastructure.

              </p>

              <div className="grid grid-cols-3 gap-5 pt-5">

                <div>
                  <h3 className="text-4xl font-bold">
                    10M+
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    users
                  </p>
                </div>

                <div>
                  <h3 className="text-4xl font-bold">
                    0.3s
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    avg latency
                  </p>
                </div>

                <div>
                  <h3 className="text-4xl font-bold">
                    150+
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    countries
                  </p>
                </div>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-5 reveal">

              {
                [
                  {
                    icon: Clock,
                    value: '99.99%',
                    text: 'uptime'
                  },
                  {
                    icon: BatteryCharging,
                    value: '-18%',
                    text: 'battery usage'
                  },
                  {
                    icon: Users,
                    value: '500k',
                    text: 'group calls'
                  },
                  {
                    icon: FileText,
                    value: '∞',
                    text: 'file transfer'
                  }
                ].map((item, index) => (

                  <div
                    key={index}
                    className="glass-card rounded-3xl p-8 text-center hover-card"
                  >

                    <item.icon size={30} className="mx-auto mb-5" />

                    <h3 className="text-3xl font-bold">
                      {item.value}
                    </h3>

                    <p className="text-gray-500 mt-2 text-sm">
                      {item.text}
                    </p>

                  </div>

                ))
              }

            </div>

          </div>

        </section>

        <section className="px-6 md:px-12 py-20">

          <div className="max-w-7xl mx-auto reveal">

            <div className="glass-card rounded-[40px] p-10 md:p-16 text-center relative overflow-hidden">

              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent"></div>

              <div className="relative z-10">

                <h2 className="text-4xl md:text-6xl font-bold">

                  Start using
                  <span className="gradient-text">
                    {" "}Hash
                  </span>

                </h2>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto mt-5">

                  Experience modern encrypted messaging with realtime syncing,
                  smart UI, and powerful collaboration tools.

                </p>

                <div className="flex flex-wrap justify-center gap-4 mt-10">

                  <button className="px-8 py-4 bg-white text-black rounded-2xl font-semibold flex items-center gap-2 hover:scale-105 transition">

                    <Download size={18} />

                    Download App

                  </button>

                  <a
                    href="mailto:iamtheboss357286@gmail.com"
                    className="px-8 py-4 border border-white/10 rounded-2xl bg-white/5 flex items-center gap-2 hover:bg-white/10 transition"
                  >

                    <Mail size={18} />

                    Contact Team

                  </a>

                </div>

              </div>

            </div>

          </div>

        </section>

        <footer
          id="footer"
          className="border-t border-white/5 py-16 px-6 md:px-12"
        >

          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10">

            <div>

              <div className="flex items-center gap-2 mb-5">

                <MessageCircle size={20} />

                <h2 className="text-2xl font-semibold">
                  Hash.
                </h2>

              </div>

              <p className="text-gray-500 leading-relaxed">

                Modern private messaging platform built for the future.

              </p>

              <div className="flex gap-4 mt-6 text-gray-400">

                <a
                  href="https://www.facebook.com/mo.nuel.5?mibextid=LQQJ4d"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="hover:text-white transition"
                >
                  <Facebook size={18} />
                </a>
                <a
                  href="mailto:iamtheboss357286@gmail.com"
                  aria-label="Email"
                  className="hover:text-white transition"
                >
                  <Mail size={18} />
                </a>
                <a
                  href="https://github.com/iamthenobel"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  className="hover:text-white transition"
                >
                  <GitHub size={18} />
                </a>

              </div>

            </div>

            <div>

              <h3 className="font-semibold mb-5">
                Product
              </h3>

              <div className="space-y-3 text-gray-500">

                <p>Features</p>
                <p>Security</p>
                <p>Download</p>
                <p>Updates</p>

              </div>

            </div>

            <div>

              <h3 className="font-semibold mb-5">
                Company
              </h3>

              <div className="space-y-3 text-gray-500">

                <p>About</p>
                <p>Blog</p>
                <p>Careers</p>
                <p>Press</p>

              </div>

            </div>

            <div>

              <h3 className="font-semibold mb-5">
                Legal
              </h3>

              <div className="space-y-3 text-gray-500">

                <p>Privacy</p>
                <p>Terms</p>
                <p>Cookies</p>
                <p>License</p>

              </div>

            </div>

          </div>

          <div className="text-center text-gray-600 text-sm mt-16 pt-8 border-t border-white/5">

            © 2026 Hash. All rights reserved.

          </div>

        </footer>

      </main>

    </div>

  )

}