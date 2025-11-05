import AuthGate from "../components/AuthGate";
import NeonSidebar from "../components/NeonSidebar";
import Dashboard from "../components/Dashboard";
import LiveMultiplierBadge from "../components/LiveMultiplierBadge";
import FitToViewport from "../components/FitToViewport";

export default function Home() {
  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 -left-40 h-[55rem] w-[55rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.14),_transparent_60%)] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[55rem] w-[55rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.14),_transparent_60%)] blur-3xl" />
      </div>
      <div className="ai-border" aria-hidden="true" />

      <AuthGate brand="Crash AI Genius">
        <div className="relative z-10 flex">
          <NeonSidebar />
          <main className="flex-1 p-6 md:p-8 w-full md:w-[1100px] mx-auto">
            <FitToViewport minScale={0.6} maxScale={1}>
              <div>
                <header className="flex items-center justify-between mb-6">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#8DB600]">Crash AI Genius</h1>
                  <div className="flex items-center gap-5">
                    <LiveMultiplierBadge />
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">PRO</span>
                  </div>
                </header>
                <Dashboard />
                <footer className="mt-10">
                  <div className="relative overflow-hidden rounded-2xl p-10 md:p-12 bg-gradient-to-br from-[#0d1117] via-[#0b1015] to-[#0d1117] border border-amber-400/30 shadow-[0_0_80px_rgba(251,191,36,0.18)]">
                    <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
                    <div className="relative">
                      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mb-8" />
                      <div className="text-center">
                        <div className="mx-auto inline-flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)]" />
                          <div className="text-base md:text-lg font-semibold bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300 bg-clip-text text-transparent">Powered by Crash AI Genius</div>
                          <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.9)]" />
                        </div>
                        <div className="text-xs md:text-sm text-slate-300/90 mb-6">© 2025</div>
                        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 lg:gap-6">
                          <a href="mailto:ylikagwa@gmail.com" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 visited:text-amber-300 hover:text-amber-200 transition">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90"><path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5"/></svg>
                            <span className="leading-none">ylikagwa@gmail.com</span>
                          </a>
                          <a href="tel:+265880646248" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 visited:text-amber-300 hover:text-amber-200 transition">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90"><path d="M6.6 10.8a12 12 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.23 11.5 11.5 0 003.5.56 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.47a1 1 0 011 1 11.5 11.5 0 00.56 3.5 1 1 0 01-.23 1.1L6.6 10.8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                            <span className="leading-none">+265 880 646 248</span>
                          </a>
                          <a href="https://wa.me/265880646248" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 hover:text-green-200 transition" title="Chat on WhatsApp">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="opacity-90"><path d="M20.5 3.5A10 10 0 006.8 18.8L3 21l2.3-3.8A10 10 0 1020.5 3.5zm-9.6 3c.2 0 .4 0 .6.4l.8 1.9c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.5 0 .8 0 0 .9 1.5 2.1 2.1.3.2.6.1.8 0l.7-.6c.2-.2.4-.2.7-.1l1.9.8c.4.2.4.4.4.6 0 1-.8 1.8-1.8 1.8-.3 0-.6 0-1-.1-1.9-.4-4.2-2.1-5.3-3.3-1.2-1.2-2.9-3.5-3.3-5.3-.1-.4-.1-.7-.1-1 0-1 .8-1.8 1.8-1.8z"/>
                            </svg>
                            <span className="leading-none">WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </FitToViewport>
          </main>
        </div>
      </AuthGate>
    </div>
  );
}
