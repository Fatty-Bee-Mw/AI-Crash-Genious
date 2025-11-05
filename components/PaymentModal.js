import { useState } from "react";

export default function PaymentModal({ open, onClose, onPaid }) {
  const [provider, setProvider] = useState("Airtel Money");
  const [msisdn, setMsisdn] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 border border-emerald-400/30 bg-[#0d1117] shadow-[0_0_40px_rgba(16,185,129,0.15)]">
        <h3 className="text-xl font-bold">Complete Payment</h3>
        <p className="text-sm text-slate-300/90 mt-1">Pay MK 1,500 to receive a 3-day access code. Select your local provider.</p>

        <div className="mt-4 space-y-3">
          <div className="text-xs text-slate-300/80">Choose Provider</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={provider === 'Airtel Money'}
              onClick={()=> setProvider('Airtel Money')}
              className={`px-3 py-2 rounded-lg border text-sm transition ${provider==='Airtel Money' ? 'bg-red-500/50 border-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.45)] ring-1 ring-red-400/60' : 'bg-white/7 border-white/20 text-slate-200 hover:bg-white/10'}`}
            >Airtel Money</button>
            <button
              type="button"
              aria-pressed={provider === 'TNM Mpamba'}
              onClick={()=> setProvider('TNM Mpamba')}
              className={`px-3 py-2 rounded-lg border text-sm transition ${provider==='TNM Mpamba' ? 'bg-emerald-500/50 border-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400/60' : 'bg-white/7 border-white/20 text-slate-200 hover:bg-white/10'}`}
            >TNM Mpamba</button>
          </div>

          <div className="text-xs text-slate-300/80">Send MK 1,500 to:</div>
          <div className="text-sm bg-[#0b0f14] border border-white/15 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span>{provider === "Airtel Money" ? "Airtel Money" : "TNM Mpamba"}</span>
              <span className="font-semibold">{provider === "Airtel Money" ? "0994000190" : "456616"}</span>
            </div>
          </div>

          <label className="text-xs text-slate-300/80">Your Mobile Number</label>
          <input type="tel" className="w-full bg-[#0b0f14] text-white caret-white placeholder-slate-400 border border-white/15 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 p-3 rounded-lg text-base tracking-wide appearance-none" value={msisdn} onChange={e=>setMsisdn(e.target.value)} placeholder="e.g. 0991xxxxxx" inputMode="numeric" />
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Cancel</button>
          <button onClick={()=> onPaid({ provider, msisdn })} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">I've Paid</button>
        </div>
      </div>
    </div>
  );
}
