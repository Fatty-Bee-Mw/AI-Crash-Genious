import { useState } from "react";

export default function RequestAccessModal({ deviceId, open, onClose, onSubmit }) {
  const [provider, setProvider] = useState("Airtel Money");
  const [msisdn, setMsisdn] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [preview, setPreview] = useState(null);
  const [fileObj, setFileObj] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [notice, setNotice] = useState("");

  if (!open) return null;

  function onFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(String(reader.result));
      setPreview(String(reader.result));
    };
    reader.readAsDataURL(file);
    setFileObj(file);
  }

  async function submit(){
    if (!imageBase64) { setNotice("Upload screenshot first"); return; }
    await onSubmit({ provider, msisdn, imageBase64, deviceId });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 border border-emerald-400/30 glass-card-strong shadow-[0_0_40px_rgba(16,185,129,0.15)]">
        <h3 className="text-xl font-bold">Request Access</h3>
        <p className="text-sm text-slate-300/90 mt-1">Pay MK 1,500, take or choose a screenshot, copy your Device ID, then send both to the WhatsApp group automatically. We'll verify and generate a device-locked code.</p>

        <div className="mt-3 bg-[#0b0f14] border border-white/15 p-3 rounded-lg">
          <div className="text-xs text-slate-300/80">Your Device ID</div>
          <div className="mt-1 font-mono text-xs break-all">{deviceId}</div>
          <button onClick={()=> { navigator.clipboard?.writeText(deviceId); }} className="mt-2 text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15">Copy Device ID</button>
          <button onClick={()=> setShowHelp(!showHelp)} className="mt-2 ml-2 text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15">{showHelp? 'Hide' : 'What is this?'}</button>
          {showHelp && (
            <div className="mt-2 text-[11px] text-slate-300/80">
              This ID uniquely identifies your device in this app. We use it to lock your access code to your device only. It does not expose personal data.
              Steps:
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Pay MK 1,500 to the numbers below.</li>
                <li>Take/choose a payment screenshot.</li>
                <li>Copy Device ID and send with screenshot to WhatsApp.</li>
                <li>Tap Submit to upload here for record.</li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <div className="text-xs text-slate-300/80">Send MK 1,500 to:</div>
          <div className="text-sm glass-card border border-white/15 p-3 rounded-lg">
            <div className="flex items-center justify-between"><span>Airtel Money</span><span className="font-semibold">0994000190</span></div>
            <div className="flex items-center justify-between mt-2"><span>TNM Mpamba</span><span className="font-semibold">456616</span></div>
          </div>

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

          <label className="text-xs text-slate-300/80">Your Mobile Number</label>
          <input type="tel" className="w-full bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/15 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 p-3 rounded-lg text-base tracking-wide appearance-none" value={msisdn} onChange={e=>setMsisdn(e.target.value)} placeholder="e.g. 0991xxxxxx" inputMode="numeric" />

          <label className="text-xs text-slate-300/80">Take/Choose Payment Screenshot</label>
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="block w-full text-xs" />
          {fileObj && (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-slate-200">
              <span className="truncate max-w-[12rem]" title={fileObj.name}>{fileObj.name}</span>
              <span className="text-white/40">•</span>
              <span>{Math.round((fileObj.size||0)/1024)} KB</span>
              <button
                type="button"
                onClick={()=>{ setImageBase64(""); setPreview(null); setFileObj(null); }}
                className="ml-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/15"
              >Remove</button>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 justify-between items-center">
          <button
            onClick={async()=>{
              const text = `Payment request for Crash AI Genius\nProvider: ${provider}\nNumber: ${msisdn||'-'}\nDevice ID: ${deviceId}\nAmount: MK 1,500\nGroup Link: https://chat.whatsapp.com/C0MSzqk4ptg5YTDIry8F4i`;
              try {
                if (navigator.share && fileObj) {
                  const files = [new File([fileObj], fileObj.name || 'receipt.jpg', { type: fileObj.type || 'image/jpeg' })];
                  await navigator.share({ text, files });
                } else {
                  const url = "https://wa.me/?text=" + encodeURIComponent(text + "\n\nPlease attach the screenshot manually if not included.");
                  window.open(url, "_blank");
                }
              } catch (_) {}
            }}
            className="px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
          >Send to WhatsApp</button>
          <button
            onClick={async()=>{
              const text = `Crash AI Genius Payment Details\nProvider: ${provider}\nYour Number: ${msisdn||'-'}\nDevice ID: ${deviceId}\nAmount: MK 1,500\nNumbers: Airtel 0994000190 | TNM 456616`;
              try { await navigator.clipboard?.writeText(text); setNotice('Details copied'); } catch(_) {}
            }}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs"
          >Copy All Details</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Cancel</button>
            <button onClick={submit} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Submit</button>
          </div>
        </div>
      </div>
      {!!notice && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={()=> setNotice("")} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 border border-white/15 glass-card-strong shadow-[0_0_40px_rgba(255,255,255,0.12)]">
            <h3 className="text-lg font-semibold">Notice</h3>
            <p className="mt-2 text-sm text-slate-200/95">{notice}</p>
            <div className="mt-5 flex justify-end">
              <button onClick={()=> setNotice("")} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
