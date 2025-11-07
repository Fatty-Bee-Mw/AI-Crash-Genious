import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import RequestAccessModal from "./RequestAccessModal";
import { getOrCreateDeviceId } from "../utils/deviceLock";
import { useAccessValidation, useAutoLogout } from "../utils/useAccessValidation";
import { clearAccessData } from "../utils/codes";

export default function AuthGate({ children, brand }) {
  const router = useRouter();
  const deviceId = useMemo(()=> getOrCreateDeviceId(), []);
  const [openPay, setOpenPay] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("checking");
  const [openAdmin, setOpenAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [openInfo, setOpenInfo] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [openNeedCode, setOpenNeedCode] = useState(false);
  const [expirationNotice, setExpirationNotice] = useState("");
  

  // Handle access code expiration when user clicks Continue with expired code
  const handleAccessExpired = useCallback((reason) => {
    setExpirationNotice(`Access ${reason}.`);
    
    // Clear access data
    clearAccessData();
  }, [router]);

  // Use access validation hook for periodic checks (disabled automatic expiration)
  const { isValid, expiration, checking } = useAccessValidation({
    onExpire: () => {
      // Do nothing - let the user continue using the app until they try to verify again
      // This prevents the automatic "Access Expired" popup
    },
    checkInterval: 30000 // Check every 30 seconds
  });

  // Auto-logout when code expires (disabled)
  // useAutoLogout({
  //   onLogout: handleAccessExpired,
  //   expirationTime: expiration
  // });

  useEffect(()=>{
    try {
      if (typeof window !== 'undefined') {
        
        
        const adminSess = localStorage.getItem('admin_session');
        if (adminSess === '1') { setStatus('ok'); return; }
        const admin = localStorage.getItem('admin_code_plain');
        if (admin) { setStatus('ok'); localStorage.removeItem('admin_code_plain'); return; }
        // Force users to re-enter access code on each restart
        localStorage.removeItem('active_code');
      }
    } catch {}
    setStatus('need');
  }, [deviceId]);

  

  async function handleVerify() {
    if (!code) { setOpenNeedCode(true); return; }
    try {
      const resp = await fetch('/api/codes/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code, deviceId }) });
      const data = await resp.json();
      if (!resp.ok) { 
        // Check if the error is due to expiration
        if (data.reason && data.reason.toLowerCase().includes('expired')) {
          handleAccessExpired('Expired');
        } else {
          setFeedbackMsg(data.reason || data.error || 'Invalid code'); 
        }
        return; 
      }
      localStorage.setItem("active_code", code);
      setStatus("ok");
    } catch {
      setFeedbackMsg("Verification failed");
    }
  }

  async function handleSubmitRequest({ provider, msisdn, imageBase64 }) {
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, msisdn, imageBase64, deviceId })
      });
      if (!res.ok) throw new Error("Failed to submit");
      setOpenPay(false);
      setFeedbackMsg("Request submitted. Share your screenshot in WhatsApp as well. You'll receive a code after approval.");
    } catch (e) {
      setFeedbackMsg("Failed to submit request");
    }
  }

  

  

  // Show expiration notice only when triggered by Continue button with expired code
  if (expirationNotice) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90">
        <div className="w-full max-w-sm rounded-2xl p-6 border border-red-400/30 glass-card-strong shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-400/30 flex items-center justify-center text-red-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="15" r="1" fill="currentColor"/>
                <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-300">Access Expired</h3>
          </div>
          <p className="text-sm text-slate-300/90">{expirationNotice}</p>
          <div className="mt-4 flex justify-end">
            <button onClick={() => { setExpirationNotice(''); setCode(''); }} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (status !== "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl p-6 border border-emerald-400/30 glass-card shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <div className="text-xs mb-2 text-slate-300/90">Welcome to</div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-[#8DB600]">{brand}</h1>
            <button onClick={()=> setOpenInfo(true)} aria-label="How it works" className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs inline-flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 17v-6" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg>
              <span>Info</span>
            </button>
          </div>
          <p className="text-sm text-slate-300/90 mt-2">Enter your access code or complete a payment to receive one. Codes are locked to your device for 3 days.</p>
          <div className="mt-2 text-xs text-slate-400/90">Your device ID will be required for approval.</div>

          <div className="mt-4 space-y-2">
            <label className="text-xs text-slate-300/80">Access Code</label>
            <input value={code} onChange={e=>setCode(e.target.value)} className="w-full bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/15 p-2 rounded-lg tracking-widest" placeholder="Enter your purchased access code here" />
          </div>

          {/* CAPTCHA removed */}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={handleVerify} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Continue</button>
            <button onClick={()=> setOpenPay(true)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Pay MK 1,500</button>
            <button onClick={()=> setOpenAdmin(true)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Admin Login</button>
            
            <button onClick={async()=>{
              try {
                if (!code) { setOpenNeedCode(true); return; }
                const resp = await fetch('/api/codes/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code, deviceId }) });
                if (resp.ok) {
                  try { localStorage.setItem('active_code', code); } catch {}
                  setStatus('ok');
                } else {
                  setFeedbackMsg('Your code is invalid or expired.');
                }
              } catch { setFeedbackMsg('Failed to open dashboard'); }
            }} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Open Dashboard</button>
          </div>

          

          

          <div className="mt-4 text-xs text-slate-400/90">Admin? Use universal code.</div>
        </div>

        <RequestAccessModal deviceId={deviceId} open={openPay} onClose={()=> setOpenPay(false)} onSubmit={handleSubmitRequest} />

        {openNeedCode && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={()=> setOpenNeedCode(false)} />
            <div className="relative w-full max-w-sm rounded-2xl p-6 border border-emerald-400/30 glass-card-strong shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="currentColor" strokeWidth="1.5"/></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Access code required</h3>
                  <p className="mt-1 text-sm text-slate-300/90">Enter your purchased code to continue to the dashboard. If you don’t have one, complete payment to receive a code.</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button onClick={()=> setOpenNeedCode(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Enter Code</button>
                <button onClick={()=> { setOpenNeedCode(false); setOpenPay(true); }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Pay to get code</button>
              </div>
            </div>
          </div>
        )}

        {!!feedbackMsg && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={()=> setFeedbackMsg("")} />
            <div className="relative w-full max-w-sm rounded-2xl p-6 border border-white/15 glass-card-strong shadow-[0_0_40px_rgba(255,255,255,0.12)]">
              <h3 className="text-lg font-semibold">Notice</h3>
              <p className="mt-2 text-sm text-slate-200/95">{feedbackMsg}</p>
              <div className="mt-5 flex justify-end">
                <button onClick={()=> setFeedbackMsg("")} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Close</button>
              </div>
            </div>
          </div>
        )}

        {openInfo && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={()=> setOpenInfo(false)} />
            <div className="relative w-full max-w-lg rounded-2xl p-6 border border-emerald-400/30 glass-card-strong shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <h3 className="text-xl font-bold">How Crash AI Genius Helps</h3>
              <div className="mt-2 space-y-2 text-slate-300/90 text-sm">
                <p>We predict a safe cashout point each round using recent game behavior. You get a target (e.g., 1.55x) and a confidence badge.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="font-semibold">Safer exits:</span> Focus on small multipliers to avoid big losses.</li>
                  <li><span className="font-semibold">Confidence-aware:</span> We adjust targets and risk when markets are calm or volatile.</li>
                  <li><span className="font-semibold">Protection:</span> Session loss caps and cooldown after loss streaks.</li>
                  <li><span className="font-semibold">Proof:</span> Backtest card shows recent P/L, hit rate, and drawdown.</li>
                </ul>
                <p className="text-slate-300/80">Use it to time safer cashouts, manage risk, and avoid chasing losses. If confidence is low, it may skip rounds to protect your bankroll.</p>
                <div className="mt-3">
                  <div className="font-semibold text-slate-200">Quick FAQs</div>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li><span className="font-semibold">What is Safe Cashout?</span> A suggested exit point aimed at frequent, smaller wins.</li>
                    <li><span className="font-semibold">What does Confidence mean?</span> How reliable the current prediction is based on recent data.</li>
                    <li><span className="font-semibold">Why skip a round?</span> If confidence is low or after a loss streak, we may pause to protect balance.</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <a href="/strategy" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200">Learn More</a>
                <button onClick={()=> setOpenInfo(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Close</button>
                <button onClick={()=> { setOpenInfo(false); setOpenPay(true); }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Okay, Continue</button>
              </div>
            </div>
          </div>
        )}

        {openAdmin && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={()=> setOpenAdmin(false)} />
            <div className="relative w-full max-w-sm rounded-2xl p-6 border border-emerald-400/30 bg-[#0d1117] shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <h3 className="text-xl font-bold">Admin Login</h3>
              <p className="text-sm text-slate-300/90 mt-1">Enter universal admin code to open Admin Panel.</p>
              <input value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="Admin code" className="mt-3 w-full bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/15 p-2 rounded-lg" />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=> setOpenAdmin(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Cancel</button>
                <button onClick={()=>{ try{ localStorage.setItem('admin_code_plain', adminCode || ''); }catch{} window.location.href = '/admin'; }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Open Admin</button>
              </div>
            </div>
          </div>
        )}

        
      </div>
    );
  }

  return <>{children}</>;
}
