import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Ticker from "./Ticker";

export default function Dashboard() {
  const wsRef = useRef(null);
  const MAX_HISTORY = 50;
  const [rounds, setRounds] = useState([]);
  const [live, setLive] = useState(null);
  const [stats, setStats] = useState({ wins:0, losses:0, profit:0, acc:0 });
  const [startBalance, setStartBalance] = useState(0);
  const [balance, setBalance] = useState(0);
  const [riskPct, setRiskPct] = useState(0.02);
  const [plHistory, setPlHistory] = useState([]); // per round P/L
  const smoothRef = useRef(1.2); // EWMA state for predictor
  const finalRef = useRef(1.2);  // last published prediction for anti-spike limiting
  const [nowTick, setNowTick] = useState(Date.now()); // for live ETA countdown
  const [riskOpen, setRiskOpen] = useState(false);
  const confRef = useRef(0.5);   // latest confidence score [0,1]
  const whyRef = useRef('');     // brief reason for tooltip
  const [autoTune, setAutoTune] = useState(true);
  const [autoSkip, setAutoSkip] = useState(true);
  const [autoSkipThr, setAutoSkipThr] = useState(0.55);
  const [mode, setMode] = useState('normal');
  const [stakeStrategy, setStakeStrategy] = useState('fixed'); // fixed | kelly | recovery
  const nextStakeBoostRef = useRef(1); // for recovery strategy
  const [infoOpen, setInfoOpen] = useState(false);

  // Advanced predictor params (tunable)
  const [advOpen, setAdvOpen] = useState(false);
  const [stableLo, setStableLo] = useState(0.88);
  const [stableHi, setStableHi] = useState(0.98);
  const [normalLo, setNormalLo] = useState(0.80);
  const [normalHi, setNormalHi] = useState(0.97);
  const [volatileLo, setVolatileLo] = useState(0.72);
  const [volatileHi, setVolatileHi] = useState(0.95);
  const [divSmallStable, setDivSmallStable] = useState(1.5);
  const [divSmallNormal, setDivSmallNormal] = useState(1.6);
  const [divSmallVolatile, setDivSmallVolatile] = useState(1.75);
  const [divMedium, setDivMedium] = useState(2.4);
  const [divHigh, setDivHigh] = useState(4.0);
  const [alphaStable, setAlphaStable] = useState(0.35);
  const [alphaNormal, setAlphaNormal] = useState(0.3);
  const [alphaVolatile, setAlphaVolatile] = useState(0.25);
  // Loss cap and cooldown controls
  const [lossCapPct, setLossCapPct] = useState(20); // % of startBalance
  const [cooldownAfter, setCooldownAfter] = useState(2); // losses in a row before cooldown
  const [cooldownRounds, setCooldownRounds] = useState(0);
  const [cooldownLen, setCooldownLen] = useState(2); // how many rounds to skip

  function computeSafeCashout(roundObjs=[]) {
    // More accurate predictor: weighted small-band quantiles + confidence-adjusted safety
    const arr = (roundObjs || []).map((r,i)=> ({ v: Number(r.final ?? r), i })).filter(x=> Number.isFinite(x.v));
    const small = arr.filter(x=> x.v>=1.02 && x.v<=1.99).slice(0, 500);
    const medium = arr.filter(x=> x.v>1.99 && x.v<=10).slice(0, 300);
    const high = arr.filter(x=> x.v>10).slice(0, 200);
    if (!small.length && !medium.length && !high.length) return 1.2;

    const expWeights = (list, tau=20)=> list.map(x=> ({ ...x, w: Math.exp(-x.i/tau) }));
    const sw = expWeights(small);
    const sumw = sw.reduce((a,b)=> a + b.w, 0) || 1;
    // Effective sample size for confidence
    const nEff = (sumw*sumw) / (sw.reduce((a,b)=> a + b.w*b.w, 0) || 1);
    // Winsorize extremes to reduce noise
    const sorted = [...sw].sort((a,b)=> a.v - b.v);
    const wins = (p)=> {
      const t = Math.max(0, Math.min(1, p));
      let acc = 0; for (const x of sorted){ acc += x.w; if (acc >= t*sumw) return x.v; }
      return sorted[sorted.length-1]?.v ?? 1.2;
    };
    const q85 = wins(0.85), q90 = wins(0.90), q95 = wins(0.95);
    const meanS = sorted.length ? sorted.reduce((a,b)=> a + b.v*b.w, 0)/sumw : 1.2;
    const varS = sorted.length ? sorted.reduce((a,b)=> a + b.w*Math.pow(b.v-meanS,2), 0)/sumw : 0.04;
    const stdS = Math.sqrt(varS);

    // Adaptive band selection via volatility
    let lo = normalLo, hi = normalHi;
    if (stdS <= 0.15) { lo = stableLo; hi = stableHi; }
    else if (stdS >= 0.25) { lo = volatileLo; hi = volatileHi; }

    // Use blend of weighted quantile and mean; bias toward q90
    const smallEst = 0.6*q90 + 0.25*q85 + 0.15*meanS;

    // Medium/High with caps and small weights
    const avg = (xs)=> xs.length ? xs.reduce((a,b)=> a + b.v, 0)/xs.length : 0;
    const medEst = avg(medium.map(x=> ({ v: Math.min(x.v, 8) }))); // mild cap
    const hiEst = avg(high.map(x=> ({ v: Math.min(x.v, 25) })));

    // Recent regime weights (last 30) with bias to last 5
    const finals = arr.map(x=> x.v);
    const recent = finals.slice(0,30);
    const cS = recent.filter(v=> v<=1.99).length;
    const cM = recent.filter(v=> v>1.99 && v<=10).length;
    const cH = recent.filter(v=> v>10).length;
    const last5 = finals.slice(0,5);
    let wS = cS + last5.filter(v=> v<=1.99).length*0.6;
    let wM = cM + last5.filter(v=> v>1.99 && v<=10).length*0.8;
    let wH = cH + last5.filter(v=> v>10).length*1.0;
    const ws = Math.max(1e-6, wS+wM+wH); wS/=ws; wM/=ws; wH/=ws;

    // Confidence from effective sample size and volatility
    const confSize = Math.max(0, Math.min(1, nEff/50));
    const confVol = Math.max(0, Math.min(1, 0.35/Math.max(0.12, stdS))); // lower std -> higher confidence
    const confidence = Math.max(0, Math.min(1, 0.6*confSize + 0.4*confVol));
    confRef.current = confidence;

    // Safety dividers per regime + extra based on low confidence
    const baseDivS = stdS <= 0.15 ? divSmallStable : (stdS >= 0.25 ? divSmallVolatile : divSmallNormal);
    let modeDivMul = 1.0;
    if (mode === 'safe') modeDivMul = 1.1;
    else if (mode === 'aggressive') modeDivMul = 0.9;
    const divS = (baseDivS*modeDivMul) + (1 - confidence)*0.25;
    const divM = (divMedium*modeDivMul) + (1 - confidence)*0.2;
    const divH = (divHigh*modeDivMul) + (1 - confidence)*0.4;

    // Blend and smooth
    const blended = (wS*(smallEst/divS)) + (wM*(medEst/divM)) + (wH*(hiEst/divH));
    whyRef.current = `small q90=${q90?.toFixed?.(2)??q90}, std=${stdS.toFixed(2)}, conf=${(confidence*100).toFixed(0)}%, mix S:${(wS*100).toFixed(0)} M:${(wM*100).toFixed(0)} H:${(wH*100).toFixed(0)}`;
    const alpha = stdS <= 0.15 ? alphaStable : (stdS >= 0.25 ? alphaVolatile : alphaNormal);
    let s = alpha * blended + (1 - alpha) * (smoothRef.current || 1.2);
    smoothRef.current = s;

    // Undercut-aware safety: if recent decisions undercut often, tighten further
    const decisions = (roundObjs||[]).map(r=> ({ success: !!r.success, bet: r.bet||0 })).filter(x=> x.bet>0).slice(0, 20);
    const winsD = decisions.filter(x=> x.success).length;
    const lossesD = decisions.filter(x=> !x.success).length;
    const rate = (winsD+lossesD) ? (lossesD/(winsD+lossesD)) : 0;
    const penalty = 1 - Math.min(0.12, rate*0.12); // up to -12%

    // Final safety and clamp
    // Actionable tuning: nudge target up/down by confidence and small accuracy
    if (autoTune) {
      const c = confRef.current || 0;
      if (c >= 0.7) s += 0.05;           // confidence high: allow slightly higher target
      else if (c >= 0.4 && c < 0.5) s -= 0.05; // medium-low confidence: a bit more conservative
      // if small-window accuracy is lagging, tighten further
      const sa = Number(stats.smallAcc || 0);
      const scount = (Number(stats.smallWins||0) + Number(stats.smallLoss||0));
      if (sa > 0 && sa < 60 && scount >= 10) s -= 0.05;
    }
    const SAFE_FACTOR = mode === 'safe' ? 0.965 : (mode === 'aggressive' ? 0.985 : 0.975);
    const raw = s * SAFE_FACTOR * penalty;
    // Lower max when volatile to avoid risky targets, adjust by mode
    let maxCap = stdS >= 0.25 ? 1.7 : (stdS <= 0.15 ? 1.9 : 1.8);
    if (mode === 'safe') maxCap -= 0.1;
    if (mode === 'aggressive') maxCap += 0.1;
    let clamped = Math.max(1.02, Math.min(maxCap, raw));
    // Anti-spike limiter: do not change more than 0.15 per round
    const lastOut = finalRef.current || 1.2;
    const lim = 0.15;
    if (clamped > lastOut + lim) clamped = lastOut + lim;
    if (clamped < lastOut - lim) clamped = lastOut - lim;
    finalRef.current = clamped;
    return Number(Number(clamped).toFixed(2));
  }

  // ---- High multiplier (>=10x) ETA tracking ----
  function computeHighEta(list=[]) {
    const highs = (list||[]).filter(r=> Number(r.final)>=10 && Number.isFinite(r.time));
    if (highs.length < 2) return null;
    // Chronological (oldest -> newest)
    const times = highs.map(r=> r.time).sort((a,b)=> a-b);
    const gaps = [];
    for (let i=1;i<times.length;i++) { const d = times[i]-times[i-1]; if (d>0 && d<6*60*60*1000) gaps.push(d); }
    if (!gaps.length) return null;
    // EWMA of last up to 12 gaps
    const recent = gaps.slice(-12);
    let ewma = recent[0];
    const alpha = 0.35;
    for (let i=1;i<recent.length;i++) ewma = alpha*recent[i] + (1-alpha)*ewma;
    // Safety clamp between 3m and 120m (tunable bounds)
    const HI_MIN_GAP_MS = 3*60*1000;
    const HI_MAX_GAP_MS = 120*60*1000;
    const avgGap = Math.max(HI_MIN_GAP_MS, Math.min(HI_MAX_GAP_MS, ewma));
    const lastAt = times[times.length-1];
    const predictedAt = lastAt + avgGap;
    return { predictedAt, avgGap, lastAt };
  }

  function fmtDuration(ms) {
    if (ms <= 0) return 'now';
    const s = Math.floor(ms/1000);
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    if (h>0) return `${h}h ${m}m ${sec}s`;
    if (m>0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function buildSignalMessage() {
    const hi = computeHighEta(rounds.slice(0, MAX_HISTORY));
    const predicted = computeSafeCashout(rounds.slice(0, MAX_HISTORY));
    const parts = [];
    parts.push('🚨 Crash AI Genius — High Multiplier Signal');
    if (hi) {
      const mins = Math.round((hi.avgGap||0)/60000);
      parts.push(`Next 10x ETA: ${fmtDuration((hi.predictedAt||0) - Date.now())} @ ${new Date(hi.predictedAt).toLocaleTimeString()}`);
      parts.push(`Avg gap: ~${mins}m | Last 10x: ${new Date(hi.lastAt).toLocaleTimeString()}`);
    } else {
      parts.push('Next 10x ETA: learning… (insufficient data)');
    }
    parts.push(`Safe cashout now: ${Number(predicted).toFixed(2)}x`);
    const total = (stats.wins||0) + (stats.losses||0);
    const acc = total ? `${(stats.acc||0).toFixed(1)}%` : '—';
    parts.push(`Performance: ${acc} success | Wins ${stats.wins||0} / Losses ${stats.losses||0}`);
    // recent highs
    const highs = rounds.filter(r=> Number(r.final)>=10 && Number.isFinite(r.time)).slice(0,5);
    if (highs.length) {
      parts.push('Recent 10x+: ' + highs.map(r=> `${Number(r.final).toFixed(2)}x@${new Date(r.time).toLocaleTimeString()}`).join(', '));
    }
    parts.push('— shared via Crash AI Genius');
    return parts.join('\n');
  }

  function handleRoundEnd(mult) {
    const suggested = computeSafeCashout(rounds.slice(0, MAX_HISTORY));
    // Bet sizing based on current balance and risk percentage
    const preBalance = balance;
    // Base risk by strategy
    let effRisk = riskPct;
    if (stakeStrategy === 'kelly') {
      const p = Math.max(0, Math.min(1, confRef.current || 0));
      const b = Math.max(0.02, (suggested || 1.2) - 1); // edge case guard
      let f = p - (1 - p) / b; // Kelly fraction
      // mode caps
      const cap = mode === 'safe' ? 0.02 : (mode === 'aggressive' ? 0.05 : 0.03);
      effRisk = Math.max(0, Math.min(cap, f || 0));
    } else if (stakeStrategy === 'recovery') {
      const multBoost = nextStakeBoostRef.current || 1;
      effRisk = riskPct * multBoost;
      const cap = mode === 'safe' ? 0.03 : (mode === 'aggressive' ? 0.07 : 0.05);
      effRisk = Math.max(0, Math.min(cap, effRisk));
    }
    // Actionable tuning: adjust risk based on confidence
    if (autoTune) {
      const c = confRef.current || 0;
      if (c >= 0.7) effRisk = Math.min(0.05, effRisk + 0.005); // +0.5%
      else if (c >= 0.5) effRisk = Math.min(0.05, effRisk + 0.0025); // +0.25%
      else if (c >= 0.4) effRisk = Math.max(0, effRisk * 0.5); // halve risk
      else if (!autoSkip) effRisk = 0; // very low confidence -> skip (only when autoSkip is off)
    }
    const rawBet = preBalance * effRisk;
    const bet = Math.max(1, Math.floor(rawBet));
    // Session loss cap check
    const maxLoss = (startBalance||0) * (Math.max(0, lossCapPct)/100);
    const sessionLoss = Math.max(0, (startBalance||0) - balance);
    const capHit = maxLoss>0 && sessionLoss >= maxLoss;
    const inCooldown = cooldownRounds > 0;
    const lowConf = (confRef.current||0) < (autoSkipThr||0);
    const willBet = suggested >= 1.02 && !capHit && !inCooldown && effRisk > 0 && !(autoSkip && lowConf);
    const isNeutral = mult <= 1.02; // treat 1.02x as neutral (no win/loss accounting)
    // Use epsilon-stable comparison to avoid rounding artifacts
    const EPS = 1e-6;
    const successPred = !isNeutral && (mult + EPS) >= suggested;
    const success = willBet && successPred;
    const r = { final:Number(mult.toFixed(2)), suggested:Number(suggested.toFixed(2)), bet: willBet && !isNeutral ? bet : 0, success, time:Date.now() };
    setRounds(prev=> [r, ...prev].slice(0,MAX_HISTORY));
    // Compute P/L and update balance and stats
    const delta = (willBet && !isNeutral) ? (success ? (bet * (suggested - 1)) : -bet) : 0;
    // Update recovery boost for next round
    if (stakeStrategy === 'recovery') {
      if (willBet && !isNeutral && !success) {
        const factor = mode === 'safe' ? 1.3 : (mode === 'aggressive' ? 1.8 : 1.5);
        const maxBoost = mode === 'safe' ? 1.7 : (mode === 'aggressive' ? 2.5 : 2.0);
        nextStakeBoostRef.current = Math.min(maxBoost, (nextStakeBoostRef.current || 1) * factor);
      } else if (willBet && success) {
        nextStakeBoostRef.current = 1;
      }
    } else {
      nextStakeBoostRef.current = 1;
    }
    setBalance(prev => {
      const next = Number(Math.max(0, prev + delta).toFixed(2));
      try {
        if (typeof window !== "undefined") localStorage.setItem("balance", String(next));
      } catch {}
      return next;
    });
    setPlHistory(prev => [Number(delta.toFixed(2)), ...prev].slice(0, MAX_HISTORY));
    setStats(prev=>{
      const wins = prev.wins + (successPred?1:0);
      const isLoss = (!isNeutral && !successPred);
      const losses = prev.losses + (isLoss?1:0);
      const profit = Number((balance + delta - startBalance).toFixed(2));
      const acc = wins+losses ? Number(((wins/(wins+losses))*100).toFixed(1)) : 0;
      // small-band accuracy (final in [1.02, 1.99])
      const inSmall = mult >= 1.02 && mult <= 1.99;
      const smallWins = (prev.smallWins||0) + (inSmall && successPred ? 1 : 0);
      const smallLoss = (prev.smallLoss||0) + (inSmall && !successPred ? 1 : 0);
      const smallAcc = (smallWins+smallLoss) ? Number(((smallWins/(smallWins+smallLoss))*100).toFixed(1)) : 0;
      // manage cooldown: trigger only after N consecutive losses
      setCooldownRounds(old => {
        if (capHit) return Math.max(old, cooldownLen);
        // compute loss streak including current result
        let streak = 0;
        const recent = [{ bet: r.bet, success }, ...rounds.slice(0, cooldownAfter+2).map(x=> ({ bet: x.bet, success: !!x.success }))];
        for (const t of recent) {
          if (t.bet>0 && !t.success) streak++; else break;
        }
        if (streak >= Math.max(1, cooldownAfter)) return Math.max(old, cooldownLen);
        return old>0 ? old-1 : 0;
      });
      return { wins, losses, profit, acc, smallWins, smallLoss, smallAcc };
    });
    setLive(null);
  }

  useEffect(()=>{
    wsRef.current = new WebSocket("wss://crash.tgaproxy.online/ws/gameserver");
    wsRef.current.onmessage = (evt)=>{
      let msg = typeof evt.data === "string" ? evt.data.trim() : String(evt.data);
      if (msg.startsWith(")]}',")) msg = msg.slice(5).trim();
      const sio = msg.match(/^\d+(\[.*)$/s); if (sio) msg = sio[1];
      let tokens = [];
      if (msg.startsWith("[")) {
        try { const arr = JSON.parse(msg); if (Array.isArray(arr)) tokens = arr.map(x=> String(x)); } catch {}
      }
      if (!tokens.length) {
        const t=[]; let cur="",q=false; for(let i=0;i<msg.length;i++){const ch=msg[i]; if(ch==='"'&&msg[i-1]!=="\\"){q=!q;continue;} if(ch===","&&!q){t.push(cur);cur="";continue;} cur+=ch;} if(cur!=='')t.push(cur); tokens=t;
      }
      if (tokens[0]==="5") {
        let mult=null; if(tokens[3]){const c=parseFloat(tokens[3]); if(!Number.isNaN(c)&&c>=1) mult=c;}
        if(mult===null){ for(let i=1;i<tokens.length;i++){ const n=parseFloat(tokens[i]); if(!Number.isNaN(n)&&n>=1){ mult=n; break; } } }
        if(mult) handleRoundEnd(Number(mult));
        return;
      }
      if (tokens[0]==="4" && tokens[1]) { const n=parseFloat(tokens[1]); if(!Number.isNaN(n)) setLive(n); }
    };
    return ()=> { try{wsRef.current?.close();}catch{} };
  },[]);

  // Tick every second to refresh ETA countdowns
  useEffect(()=>{
    const id = setInterval(()=> setNowTick(Date.now()), 1000);
    return ()=> clearInterval(id);
  },[]);

  // Load persisted settings
  useEffect(()=>{
    try {
      if (typeof window === "undefined") return;
      const sb = parseFloat(localStorage.getItem("startBalance") || "0");
      const bal = parseFloat(localStorage.getItem("balance") || (isNaN(sb)?"0":String(sb)));
      const rp = parseFloat(localStorage.getItem("riskPct") || "0.02");
      const ask = localStorage.getItem("autoSkip");
      const askThr = parseFloat(localStorage.getItem("autoSkipThr") || "55");
      const md = localStorage.getItem("mode") || 'normal';
      const ss = localStorage.getItem("stakeStrategy") || 'fixed';
      setStartBalance(isNaN(sb)?0:sb);
      setBalance(isNaN(bal)?0:bal);
      setRiskPct(isNaN(rp)?0.02:rp);
      setAutoSkip(ask ? ask === '1' : false);
      setAutoSkipThr(isNaN(askThr)?0.55:Math.max(0, Math.min(1, askThr/100)));
      setMode(md === 'safe' || md === 'aggressive' ? md : 'normal');
      setStakeStrategy(ss === 'kelly' || ss === 'recovery' ? ss : 'fixed');
      // Daily baseline init
      try {
        const today = new Date().toDateString();
        const savedDate = localStorage.getItem('dailyDate');
        const savedBase = parseFloat(localStorage.getItem('dailyBaseline')||'NaN');
        if (savedDate !== today || !Number.isFinite(savedBase)) {
          localStorage.setItem('dailyDate', today);
          localStorage.setItem('dailyBaseline', String(isNaN(bal)?0:bal));
        }
      } catch {}
      // Load advanced params
      const ap = JSON.parse(localStorage.getItem("advPredictor") || "{}");
      if (ap && typeof ap === 'object') {
        if (ap.stableLo) setStableLo(ap.stableLo);
        if (ap.stableHi) setStableHi(ap.stableHi);
        if (ap.normalLo) setNormalLo(ap.normalLo);
        if (ap.normalHi) setNormalHi(ap.normalHi);
        if (ap.volatileLo) setVolatileLo(ap.volatileLo);
        if (ap.volatileHi) setVolatileHi(ap.volatileHi);
        if (ap.divSmallStable) setDivSmallStable(ap.divSmallStable);
        if (ap.divSmallNormal) setDivSmallNormal(ap.divSmallNormal);
        if (ap.divSmallVolatile) setDivSmallVolatile(ap.divSmallVolatile);
        if (ap.divMedium) setDivMedium(ap.divMedium);
        if (ap.divHigh) setDivHigh(ap.divHigh);
        if (ap.alphaStable) setAlphaStable(ap.alphaStable);
        if (ap.alphaNormal) setAlphaNormal(ap.alphaNormal);
        if (ap.alphaVolatile) setAlphaVolatile(ap.alphaVolatile);
      }
    } catch {}
  },[]);

  function handleSaveSettings() {
    const sb = Number(startBalance) || 0;
    const bal = Number(balance) || 0;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("startBalance", String(sb));
        localStorage.setItem("balance", String(bal));
        localStorage.setItem("riskPct", String(riskPct));
        localStorage.setItem("autoSkip", autoSkip ? '1' : '0');
        localStorage.setItem("autoSkipThr", String(Math.round((autoSkipThr||0)*100)));
        localStorage.setItem("mode", mode);
        localStorage.setItem("stakeStrategy", stakeStrategy);
        localStorage.setItem("advPredictor", JSON.stringify({
          stableLo, stableHi,
          normalLo, normalHi,
          volatileLo, volatileHi,
          divSmallStable, divSmallNormal, divSmallVolatile,
          divMedium, divHigh,
          alphaStable, alphaNormal, alphaVolatile,
        }));
      }
    } catch {}
    setStats(prev => ({ ...prev, profit: Number((bal - sb).toFixed(2)) }));
  }

  function handleResetBalance() {
    setBalance(startBalance);
    try { if (typeof window !== "undefined") localStorage.setItem("balance", String(startBalance)); } catch {}
    setPlHistory([]);
    setStats(prev => ({ ...prev, profit: 0 }));
  }

  const latest = rounds[0];

  // Build equity curve from startBalance + cumulative P/L
  const equitySeries = (()=>{
    const base = startBalance || 0;
    let cum = base;
    const arr = [base];
    for (let i = plHistory.length - 1; i >= 0; i--) {
      cum += plHistory[i];
      arr.push(Number(cum.toFixed(2)));
    }
    return arr.slice(-20); // limit points
  })();

  function EquitySparkline() {
    const w = 240, h = 60, pad = 6;
    const values = equitySeries.length ? equitySeries : [startBalance];
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = Math.max(1, maxV - minV);
    const pts = values.map((v,i)=>{
      const x = pad + (i*(w-2*pad))/Math.max(1, values.length-1);
      const y = h - pad - ((v - minV)*(h-2*pad))/span;
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={w} height={h} className="block">
        <polyline fill="none" stroke="rgb(52,211,153)" strokeWidth="2" points={pts} />
      </svg>
    );
  }

  function PLBarMini() {
    const items = plHistory.slice(0, 20);
    const maxAbs = Math.max(1, ...items.map(v=>Math.abs(v)));
    return (
      <div className="flex items-end gap-1 h-16">
        {items.map((v, i)=>{
          const h = Math.max(2, Math.round((Math.abs(v)/maxAbs)*60));
          const cls = v >= 0 ? "bg-emerald-400/80" : "bg-rose-400/80";
          return <div key={i} className={`${cls}`} style={{ width: 8, height: h }} title={(v>=0?"+":"")+v.toFixed(2)} />
        })}
      </div>
    );
  }

  // Derived performance metrics
  const totalDecisions = (stats.wins||0) + (stats.losses||0);
  const successPct = totalDecisions ? Number((stats.acc||0).toFixed(1)) : 0;
  const lossPct = totalDecisions ? Number((100 - (stats.acc||0)).toFixed(1)) : 0;
  const smallWins = stats.smallWins || 0;
  const smallLoss = stats.smallLoss || 0;
  const smallTotal = smallWins + smallLoss;
  const smallAcc = smallTotal ? Number(((smallWins/(smallTotal))*100).toFixed(1)) : 0;

  // High ETA derivation
  const hi = computeHighEta(rounds.slice(0, MAX_HISTORY));
  const etaMs = hi ? (hi.predictedAt - nowTick) : null;
  const roiPct = startBalance>0 ? Number((((balance - startBalance)/startBalance)*100).toFixed(1)) : 0;
  let dailyPL = 0;
  try {
    const base = parseFloat((typeof window!=="undefined" && localStorage.getItem('dailyBaseline'))||'0')||0;
    dailyPL = Number((balance - base).toFixed(2));
  } catch {}
  const lowConfNow = !!(autoSkip && (confRef.current||0) < (autoSkipThr||0));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="inline-flex gap-3 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent py-1">
          <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-slate-100 text-xs">
            <span className="opacity-80">ROI:</span>
            <span className={`ml-1 font-semibold ${roiPct>=0? 'text-emerald-300':'text-rose-300'}`}>{roiPct>=0?'+':''}{roiPct}%</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-slate-100 text-xs">
            <span className="opacity-80">Daily P/L:</span>
            <span className={`ml-1 font-semibold ${dailyPL>=0? 'text-emerald-300':'text-rose-300'}`}>{dailyPL>=0?'+':''}{dailyPL.toFixed(2)}</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs">
            <span className="opacity-80">Success:</span>
            <span className="ml-1 font-semibold">{successPct}% ({stats.wins||0})</span>
          </div>
          {lowConfNow && (
            <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-amber-300 text-xs" title={`Conf ${(Math.round((confRef.current||0)*100))}% < ${Math.round((autoSkipThr||0)*100)}%`}>
              Auto-skip: low confidence
            </div>
          )}
          <div className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-400/30 text-rose-300 text-xs">
            <span className="opacity-80">Loss:</span>
            <span className="ml-1 font-semibold">{lossPct}% ({stats.losses||0})</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs">
            <span className="opacity-80">Small Acc:</span>
            <span className="ml-1 font-semibold">{smallAcc}% ({smallWins}/{smallLoss})</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs" title={hi ? `avg gap ~ ${Math.round((hi.avgGap||0)/60000)}m; last @ ${new Date(hi.lastAt).toLocaleTimeString()}` : 'insufficient data'}>
            <span className="opacity-80">Next 10x:</span>
            <span className="ml-1 font-semibold">{etaMs==null ? '—' : fmtDuration(etaMs)}</span>
            {hi && (
              <span className="ml-2 text-[10px] text-slate-300/80 align-middle">@ {new Date(hi.predictedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        <div className="inline-flex gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent py-1">
          <a
            href="https://media.premierbetpartners.com/redirect.aspx?pid=127519&bid=5039"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs"
            title="Register & Play via our partner"
          >
            Register & Play
          </a>
          <button
            onClick={async()=>{
              const msg = buildSignalMessage();
              try { await navigator.clipboard?.writeText(msg); } catch {}
              const recRaw = (process.env.NEXT_PUBLIC_WHATSAPP_RECIPIENTS||'').split(',').map(s=> s.trim()).filter(Boolean);
              const rec = recRaw.map(s=> s.replace(/\D/g,'')).filter(Boolean);
              const phone = rec[0] || '';
              const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
              window.open(url, '_blank');
            }}
            className="px-3 py-1 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 text-xs"
            title="Share Next 10x signal via WhatsApp"
          >
            Share to WhatsApp
          </button>
          <button
            onClick={()=>{
              const url = process.env.NEXT_PUBLIC_TELEGRAM_URL || '';
              if (url) { window.open(url, '_blank'); }
              else { alert('Set NEXT_PUBLIC_TELEGRAM_URL in your env to enable Telegram.'); }
            }}
            className="px-3 py-1 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 text-xs"
            title="Open Telegram"
          >
            Telegram
          </button>
          <button
            onClick={()=> setInfoOpen(true)}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-slate-100 text-xs"
            title="How to use"
            aria-label="Info"
          >
            Info
          </button>
        </div>
      </div>
      {/* Predicted Safe Cashout - Top Centered */}
      {(() => {
        const predicted = computeSafeCashout(rounds.map(r=>r.final));
        const color = predicted >= 1.5 ? 'text-emerald-300' : predicted >= 1.2 ? 'text-amber-300' : 'text-rose-300';
        return (
          <div className="rounded-2xl p-6 border border-emerald-400/20 glass-card shadow-[0_0_40px_rgba(16,185,129,0.08)] text-center">
            <div className="flex items-center justify-center gap-4">
              <div className="text-sm text-slate-200">Predicted Safe Cashout</div>
              {(() => {
                const pct = Math.round((confRef.current||0)*100);
                return (
                  <div className="flex items-center gap-2" title={`Why: ${whyRef.current}`}>
                    <span className="text-[36px] md:text-[45px] leading-none px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">Conf</span>
                    <span className="text-[16px] md:text-[18px] text-slate-200/90">{pct}%</span>
                  </div>
                );
              })()}
            </div>
            <motion.div
              key={rounds[0]?.time || 'pred'}
              initial={{opacity:0, y:6}}
              animate={{opacity:1, y:0}}
              className={`digital mt-2 font-extrabold ${color} leading-none text-[71px]`}
            >
              {predicted.toFixed(2)}x
            </motion.div>
          </div>
        );
      })()}
      {/* Recent 10x events - horizontal chips (no vertical growth) */}
      {(() => {
        const highs = rounds.filter(r=> Number(r.final)>=10 && Number.isFinite(r.time));
        const byTime = highs.length ? [...highs].sort((a,b)=> b.time - a.time).slice(0,8) : [];
        const items = byTime.map((r,i)=>{
          const cur = r.time;
          const next = byTime[i+1]?.time;
          const gap = next ? (cur - next) : null;
          return { t: cur, gap };
        });
        return (
          <div className="rounded-2xl p-3 border border-cyan-400/20 glass-card min-h-[64px]">
            <div className="text-xs text-slate-300 mb-2">Recent 10x+ Events</div>
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent py-1">
              {items.length ? (
                items.map((it, idx)=> (
                  <div key={idx} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-[11px] text-cyan-200">
                    <span className="opacity-90">{new Date(it.t).toLocaleTimeString()}</span>
                    <span className="text-slate-400">{it.gap ? `Δ ${fmtDuration(it.gap)}` : '—'}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400/80">No 10x events yet</div>
              )}
            </div>
          </div>
        );
      })()}
      <div className="rounded-2xl p-6 border border-white/15 glass-card">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-300">Risk & Balance</div>
          <button onClick={()=> setRiskOpen(v=>!v)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs">
            {riskOpen ? 'Hide' : 'Manage Risk'}
          </button>
        </div>
        {riskOpen && (
          <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <div className="text-xs text-slate-400">Account Balance</div>
                <input type="number" value={balance} onChange={e=>setBalance(Number(e.target.value)||0)} className="mt-1 w-full bg-emerald-950/70 text-emerald-200 border border-emerald-400/40 rounded-lg px-3 py-2 outline-none focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Starting Balance</div>
                <input type="number" value={startBalance} onChange={e=>setStartBalance(Number(e.target.value)||0)} className="mt-1 w-full bg-emerald-950/70 text-emerald-200 border border-emerald-400/40 rounded-lg px-3 py-2 outline-none focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Risk per Round (%)</div>
                <input type="number" step="0.1" value={(riskPct*100).toFixed(1)} onChange={e=>setRiskPct(Math.max(0, Number(e.target.value)/100 || 0))} className="mt-1 w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-400">Auto-skip Low Confidence</div>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={autoSkip} onChange={e=> setAutoSkip(!!e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Threshold</span>
                      <input type="number" min="0" max="100" step="1" value={Math.round((autoSkipThr||0)*100)} onChange={e=> setAutoSkipThr(Math.max(0, Math.min(1, (Number(e.target.value)||0)/100)))} className="w-20 bg-[#0b0f14] text-white border border-white/15 rounded-lg px-2 py-1 text-xs" />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Mode</div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <label className="inline-flex items-center gap-1"><input type="radio" name="mode" checked={mode==='safe'} onChange={()=> setMode('safe')} /> Safe</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="mode" checked={mode==='normal'} onChange={()=> setMode('normal')} /> Normal</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="mode" checked={mode==='aggressive'} onChange={()=> setMode('aggressive')} /> Aggressive</label>
                  </div>
                </div>
                <div className="flex items-end">
                  <button onClick={()=>{ try{ const today=new Date().toDateString(); localStorage.setItem('dailyDate', today); localStorage.setItem('dailyBaseline', String(balance||0)); }catch{} }} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">Reset Daily Baseline</button>
                </div>
              </div>
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-400">Session Loss Cap (%)</div>
                  <input type="number" step="1" value={lossCapPct} onChange={e=> setLossCapPct(Math.max(0, Number(e.target.value)||0))} className="mt-1 w-full bg-[#0b0f14] text-white border border-white/15 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Cooldown After Losses</div>
                  <input type="number" step="1" value={cooldownAfter} onChange={e=> setCooldownAfter(Math.max(0, Number(e.target.value)||0))} className="mt-1 w-full bg-[#0b0f14] text-white border border-white/15 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Cooldown Length (rounds)</div>
                  <input type="number" step="1" value={cooldownLen} onChange={e=> setCooldownLen(Math.max(0, Number(e.target.value)||0))} className="mt-1 w-full bg-[#0b0f14] text-white border border-white/15 rounded-lg px-3 py-2" />
                </div>
                <div className="md:col-span-3">
                  <div className="text-xs text-slate-400">Stake Strategy</div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <label className="inline-flex items-center gap-1"><input type="radio" name="stake" checked={stakeStrategy==='fixed'} onChange={()=> setStakeStrategy('fixed')} /> Fixed %</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="stake" checked={stakeStrategy==='kelly'} onChange={()=> setStakeStrategy('kelly')} /> Kelly</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="stake" checked={stakeStrategy==='recovery'} onChange={()=> setStakeStrategy('recovery')} /> 2-step Recovery</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <button onClick={handleSaveSettings} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm">Save</button>
              <button onClick={handleResetBalance} className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm">Reset Balance</button>
            </div>
          </>
        )}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl text-center glass-card border border-emerald-400/20">
            <div className="text-xs text-slate-400">Wins</div>
            <div className="digital text-2xl font-bold text-emerald-300">{stats.wins}</div>
          </div>
          <div className="p-3 rounded-xl text-center glass-card border border-rose-400/20">
            <div className="text-xs text-slate-400">Losses</div>
            <div className="digital text-2xl font-bold text-rose-300">{stats.losses}</div>
          </div>
          <div className="p-3 rounded-xl text-center glass-card border border-amber-400/20">
            <div className="text-xs text-slate-400">Profit</div>
            <div className="digital text-2xl font-bold text-amber-300">MKW {stats.profit.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-xl text-center glass-card border border-white/15">
            <div className="text-xs text-slate-400">Balance</div>
            <div className="digital text-2xl font-bold text-slate-100">MKW {balance.toFixed(2)}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          {(() => {
            // Backtest card (use last up to 300 rounds)
            const data = rounds.slice(0, 300);
            if (!data.length) {
              return (
                <div className="p-3 rounded-xl glass-card border border-white/15 min-h-[96px] flex items-center justify-center">
                  <div className="text-[12px] text-slate-400">Backtest will appear once data is collected</div>
                </div>
              );
            }
            let equity = 0, peak = 0, maxDD = 0, wins=0, losses=0;
            for (const r of [...data].reverse()) {
              const delta = Number(((r.success? (r.bet * (r.suggested - 1)) : (r.bet? -r.bet: 0))).toFixed(2));
              if (r.bet>0) { if (r.success) wins++; else losses++; }
              equity += delta; if (equity>peak) peak=equity; const dd = peak - equity; if (dd>maxDD) maxDD=dd;
            }
            const hit = (wins+losses) ? Number(((wins/(wins+losses))*100).toFixed(1)) : 0;
            return (
              <div className="p-3 rounded-xl glass-card border border-white/15">
                <div className="text-xs text-slate-400 mb-1">Backtest (last {data.length} rounds)</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">P/L</div>
                    <div className="digital text-xl font-bold {equity>=0?'text-emerald-300':'text-rose-300'}">{equity>=0?'+':''}{equity.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Hit Rate</div>
                    <div className="digital text-xl font-bold text-slate-100">{hit}%</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Max Drawdown</div>
                    <div className="digital text-xl font-bold text-amber-300">{maxDD.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      <Ticker rounds={rounds} />
      {infoOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={()=> setInfoOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl p-6 border border-white/15 bg-[#0b0f14] shadow-[0_0_40px_rgba(255,255,255,0.12)] text-slate-100">
            <h3 className="text-lg font-semibold mb-2">How to use — New Features</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold">Auto-skip Low Confidence</div>
                <div>Enable in Manage Risk. When confidence is below your threshold (default 55%), the app skips that round. Adjust the % threshold, then Save.</div>
              </div>
              <div>
                <div className="font-semibold">Modes: Safe / Normal / Aggressive</div>
                <div>Choose your mode in Manage Risk. Safe tightens targets, Aggressive loosens slightly. Click Save to apply.</div>
              </div>
              <div>
                <div className="font-semibold">Stake Strategy</div>
                <div>
                  <div>- Fixed %: Uses your Risk per Round.</div>
                  <div>- Kelly: Uses confidence and suggested target to size stakes, with safe caps per mode.</div>
                  <div>- 2-step Recovery: After a loss, slightly increases next stake (capped) and resets on win.</div>
                </div>
              </div>
              <div>
                <div className="font-semibold">ROI% and Daily P/L</div>
                <div>Shown in the top stats. Daily P/L resets automatically each day. Use "Reset Daily Baseline" in Manage Risk to rebase manually.</div>
              </div>
              <div>
                <div className="font-semibold">Sharing Signals</div>
                <div>Use WhatsApp or Telegram buttons to share the current high-multiplier signal. Set NEXT_PUBLIC_TELEGRAM_URL to enable Telegram.</div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={()=> setInfoOpen(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
