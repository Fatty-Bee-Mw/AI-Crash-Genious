import { useEffect, useMemo, useRef, useState } from "react";

async function sha256Hex(str){
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [codeHash, setCodeHash] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState({});
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [issuedMap, setIssuedMap] = useState({});
  const [codes, setCodes] = useState([]);
  const [newDevId, setNewDevId] = useState("");
  const [newDays, setNewDays] = useState(3);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const confirmRef = useRef(null);

  function askConfirm(message, onYes){
    setConfirmMsg(message || "Are you sure?");
    confirmRef.current = onYes || null;
    setConfirmOpen(true);
  }

  const requestsByDevice = useMemo(()=>{
    const map = {};
    for (const it of items) {
      if (!map[it.deviceId] || it.createdAt > map[it.deviceId].createdAt) map[it.deviceId] = it;
    }
    return map;
  }, [items]);

  function formatRemaining(expiresAt){
    const ms = Math.max(0, expiresAt - Date.now());
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h <= 0 && m <= 0) return { label: 'Expired', expired: true };
    return { label: `${h}h ${m}m`, expired: false };
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setItems(data.items || []);
      const cr = await fetch("/api/codes", { headers: { 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': input.trim() } });
      const cd = await cr.json();
      setCodes(cd.items || []);
      const rr = await fetch('/api/recipients', { headers: { 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': input.trim() } });
      const rj = await rr.json();
      if (rr.ok) setRecipients(Array.isArray(rj.items)? rj.items: []);
      // cache admin view locally (free persistence aid)
      localStorage.setItem("admin_cache", JSON.stringify({ items: data.items||[], codes: cd.items||[], recipients: Array.isArray(rj.items)? rj.items: [] }));
    } catch (e) {}
    setLoading(false);
  }

  useEffect(()=>{ if (authed) load(); }, [authed]);
  useEffect(()=>{
    // warm start from local cache
    try {
      const raw = localStorage.getItem("admin_cache");
      if (raw) {
        const { items:ci, codes:cc, recipients: rc } = JSON.parse(raw);
        if (Array.isArray(ci)) setItems(ci);
        if (Array.isArray(cc)) setCodes(cc);
        if (Array.isArray(rc)) setRecipients(rc);
      }
    } catch {}
  }, []);

  // Auto-login if admin code was provided via AuthGate modal
  useEffect(()=>{
    (async ()=>{
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('admin_code_plain') : null;
        if (raw && !authed) {
          setInput(raw);
          const trimmed = (raw||'').trim();
          const h = await sha256Hex(trimmed);
          setCodeHash(h);
          if (trimmed === 'YusufLikagwa@Password') {
            try { localStorage.setItem('admin_session', '1'); } catch {}
            setAuthed(true);
          }
        }
      } catch {}
    })();
  }, [authed]);

  async function approveOne(it) {
    setIssuing(s=> ({ ...s, [it.id]: true }));
    try {
      const res = await fetch("/api/requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': (input||'').trim() },
        body: JSON.stringify({ id: it.id, deviceId: it.deviceId })
      });
      const data = await res.json();
      if (res.ok) {
        setIssuedMap(m=> ({ ...m, [it.id]: data.code }));
        await load();
      } else {
        setNotice(data.error || "Failed");
      }
    } catch (e) {
      setNotice("Failed");
    }
    setIssuing(s=> ({ ...s, [it.id]: false }));
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="w-full max-w-sm rounded-2xl p-6 border border-emerald-400/30 glass-card-strong shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="text-sm text-slate-200/95 mt-1">Use your universal code to moderate payment requests.</p>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Admin code" className="mt-4 w-full bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/15 p-2 rounded-lg" />
          <button onClick={async()=> { const trimmed = (input||'').trim(); const h = await sha256Hex(trimmed); setCodeHash(h); if (trimmed === 'YusufLikagwa@Password') { try { localStorage.setItem('admin_session', '1'); } catch {} setAuthed(true); } else { setNotice('Invalid admin code'); } }} className="mt-3 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 md:p-10">
      <header className="flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-emerald-300" style={{ textShadow: '0 0 10px rgba(16,185,129,0.35)' }}>Crash AI Genius — Admin</h1>
        <div className="flex gap-2">
          <button onClick={()=> { try{ localStorage.setItem('admin_code_plain', (input||'').trim()); localStorage.setItem('admin_session','1'); }catch{} window.location.href = '/'; }} className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-400/30 text-sm">Open Main Dashboard</button>
          <button onClick={async()=>{
            const res = await fetch('/api/store/export', { headers: { 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': (input||'').trim() } });
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `crash-ai-genius-backup-${Date.now()}.json`;
            a.click();
          }} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">Export JSON</button>
          <label className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={async (e)=>{
              const file = e.target.files?.[0]; if(!file) return; setImporting(true);
              const text = await file.text();
              try { await fetch('/api/store/import', { method:'POST', headers:{'Content-Type':'application/json', 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': (input||'').trim()}, body: text }); await load(); }
              catch {}
              setImporting(false);
            }} />
          </label>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1 rounded-2xl p-4 border border-emerald-400/20 glass-card">
          <h2 className="font-semibold">Generate Access Code</h2>
          <p className="text-xs text-slate-200/90">Create a 3-day device-locked code manually.</p>
          <div className="mt-3 space-y-2">
            <label className="text-xs text-slate-200/80">Device ID</label>
            <input value={newDevId} onChange={e=>setNewDevId(e.target.value)} className="w-full bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/15 p-2 rounded-lg" placeholder="paste device id" />
            <label className="text-xs text-slate-200/80">Valid Days</label>
            <input type="number" value={newDays} onChange={e=>setNewDays(Number(e.target.value))} className="w-full bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/15 p-2 rounded-lg" />
            <button onClick={async()=>{
              if(!newDevId) return setNotice('Device ID required');
              const res = await fetch('/api/codes', { method:'POST', headers:{'Content-Type':'application/json', 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': input}, body: JSON.stringify({ deviceId: newDevId, ttlMs: newDays*24*60*60*1000 }) });
              const data = await res.json();
              if(res.ok){ setNewDevId(''); await load(); setNotice(`Code: ${data.code}`); } else { setNotice(data.error||'Failed'); }
            }} className="w-full mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Generate</button>
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl p-4 border border-cyan-400/20 glass-card">
          <h2 className="font-semibold mb-2">Active Clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {codes.map(c=> {
              const rem = formatRemaining(c.expiresAt);
              const req = requestsByDevice[c.deviceId];
              const phone = req?.msisdn || '';
              const msg = `Hi${phone? ' '+phone : ''}, your Crash AI Genius access will expire in ${rem.label}. Please renew to avoid interruption.`;
              return (
                <div key={c.codeId || c.code} className="p-3 glass-card border border-white/15 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-300">Code</div>
                      <div className="font-mono text-sm" title={c.codeId || ''}>{(c.codeId||'').slice(0,8)}…</div>
                      <div className="mt-2 text-[10px] text-slate-300">Device</div>
                      <div className="font-mono text-xs break-all">{c.deviceId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-300">Expires</div>
                      <div className="text-xs">{new Date(c.expiresAt).toLocaleString()}</div>
                      <div className={`${rem.expired? 'bg-rose-500/15 text-rose-300 border border-rose-400/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/30'} mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px]`}>{rem.label}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-200/90">
                      <div className="text-[10px] text-slate-300">Phone</div>
                      <div className="font-semibold">{phone || '—'}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async()=>{ try{ await navigator.clipboard?.writeText(msg); setNotice('Message copied'); }catch{} }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs">Copy Message</button>
                      <a
                        href={`https://wa.me/${phone ? phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-xs ${!phone ? 'pointer-events-none opacity-50' : ''}`}
                      >
                        WhatsApp
                      </a>
                      <button onClick={()=>{
                        askConfirm('Revoke this code?', async()=>{
                          await fetch(`/api/codes?code=${encodeURIComponent(c.codeId)}`, { method:'DELETE', headers: { 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': input.trim() } });
                          await load();
                        });
                      }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs">Revoke</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!codes.length && (
              <div className="text-slate-400 text-sm">No active clients.</div>
            )}
          </div>
        </div>

        <div className="md:col-span-3 rounded-2xl p-4 border border-white/20 glass-card">
          <h2 className="font-semibold mb-2">WhatsApp Recipients</h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-200/90">Phone Number</label>
              <input value={newRecipient} onChange={e=> setNewRecipient(e.target.value)} placeholder="e.g. 0880123456 or 265991234567" className="mt-1 w-full bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/15 p-2 rounded-lg" />
            </div>
            <button onClick={async()=>{
              const digits = String(newRecipient||'').replace(/\D/g,'');
              if(!digits){ setNotice('Enter a valid number'); return; }
              try {
                const r = await fetch('/api/recipients', { method:'POST', headers:{'Content-Type':'application/json','X-Admin-Code-Hash': codeHash, 'X-Admin-Code': (input||'').trim() }, body: JSON.stringify({ phone: digits }) });
                if (!r.ok) { const dj = await r.json(); setNotice(dj.error||'Failed'); return; }
                setNewRecipient('');
                await load();
              } catch {}
            }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold">Add</button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {recipients.map(r=> (
              <div key={r.id} className="p-3 rounded-xl glass-card border border-white/15 flex items-center justify-between">
                <div>
                  <div className="text-sm">{r.phone}</div>
                  <div className="text-[11px] text-slate-300">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async()=>{
                    const res = await fetch(`/api/recipients/${r.id}`, { method:'PATCH', headers:{'Content-Type':'application/json','X-Admin-Code-Hash': codeHash, 'X-Admin-Code': (input||'').trim() }, body: JSON.stringify({ enabled: !r.enabled }) });
                    if (res.ok) { await load(); } else { try{ const dj=await res.json(); setNotice(dj.error||'Failed'); }catch{} }
                  }} className={`${r.enabled? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30':'bg-white/10 text-slate-200'} px-3 py-1.5 rounded-lg text-xs`}>{r.enabled? 'Enabled':'Disabled'}</button>
                  <button onClick={()=>{
                    askConfirm('Remove this recipient?', async()=>{
                      const res = await fetch(`/api/recipients/${r.id}`, { method:'DELETE', headers:{'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': (input||'').trim() } });
                      if (res.ok) { await load(); } else { try{ const dj=await res.json(); setNotice(dj.error||'Failed'); }catch{} }
                    });
                  }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs">Delete</button>
                </div>
              </div>
            ))}
            {!recipients.length && (
              <div className="text-slate-400">No recipients yet.</div>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(it => (
          <div key={it.id} className="rounded-2xl overflow-hidden border border-white/10 glass-card">
            {it.imageBase64 && (
              <img src={it.imageBase64} alt="receipt" className="w-full h-48 object-cover border-b border-white/10" />
            )}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300/80">
                <span>ID: {it.id}</span>
                <span>{new Date(it.createdAt).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="glass-card border border-white/10 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-300">Provider</div>
                  <div className="font-semibold">{it.provider || '—'}</div>
                </div>
                <div className="glass-card border border-white/10 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-300">Number</div>
                  <div className="font-semibold">{it.msisdn || '—'}</div>
                </div>
                <div className="glass-card border border-white/10 p-2 rounded-lg col-span-2">
                  <div className="text-[10px] text-slate-300">Device ID</div>
                  <div className="font-mono text-xs break-all">{it.deviceId}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className={`${it.status==='approved' ? 'border-emerald-400/30 text-emerald-300 bg-emerald-500/10' : 'border-amber-400/30 text-amber-300 bg-amber-500/10'} text-xs px-2 py-1 rounded-full border`}>{it.status}</span>
                <div className="flex gap-2 items-center">
                  {issuedMap[it.id] && (
                    <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-2 py-1 rounded">Code: {issuedMap[it.id]}</span>
                  )}
                  <button disabled={issuing[it.id]} onClick={()=> approveOne(it)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm font-semibold disabled:opacity-60">
                    {issuing[it.id] ? 'Issuing…' : 'Approve + Issue Code'}
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[10px] text-slate-300 mb-1">Notes</div>
                <textarea defaultValue={it.notes||''} placeholder="Txn refs, confirmations, comments..." className="w-full h-20 bg-[#0b0f14] text-white caret-white placeholder-white/70 border border-white/10 p-2 rounded-lg text-sm" onBlur={async (e)=>{
                  const val = e.target.value;
                  await fetch('/api/requests/notes', { method:'POST', headers:{'Content-Type':'application/json', 'X-Admin-Code-Hash': codeHash, 'X-Admin-Code': (input||'').trim()}, body: JSON.stringify({ id: it.id, notes: val }) });
                }} />
              </div>
            </div>
          </div>
        ))}
        {!items.length && !loading && (
          <div className="text-slate-400">No requests yet.</div>
        )}
      </main>

      {!!notice && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center">
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

      {confirmOpen && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={()=> setConfirmOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 border border-white/15 glass-card-strong shadow-[0_0_40px_rgba(255,255,255,0.12)]">
            <h3 className="text-lg font-semibold">Confirm Action</h3>
            <p className="mt-2 text-sm text-slate-200/95">{confirmMsg}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=> setConfirmOpen(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Cancel</button>
              <button onClick={async()=>{ try { await confirmRef.current?.(); } finally { setConfirmOpen(false); } }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 font-semibold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
