import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveMultiplierBadge() {
  const wsRef = useRef(null);
  const [live, setLive] = useState(null);

  useEffect(() => {
    try {
      wsRef.current = new WebSocket("wss://crash.tgaproxy.online/ws/gameserver");
      wsRef.current.onmessage = (evt) => {
        let msg = typeof evt.data === "string" ? evt.data.trim() : String(evt.data);
        if (msg.startsWith(")]}',")) msg = msg.slice(5).trim();
        const sio = msg.match(/^\d+(\[.*)$/s);
        if (sio) msg = sio[1];
        let tokens = [];
        if (msg.startsWith("[")) {
          try {
            const arr = JSON.parse(msg);
            if (Array.isArray(arr)) tokens = arr.map((x) => String(x));
          } catch {}
        }
        if (!tokens.length) {
          const t = [];
          let cur = "",
            q = false;
          for (let i = 0; i < msg.length; i++) {
            const ch = msg[i];
            if (ch === '"' && msg[i - 1] !== "\\") {
              q = !q;
              continue;
            }
            if (ch === "," && !q) {
              t.push(cur);
              cur = "";
              continue;
            }
            cur += ch;
          }
          if (cur !== "") t.push(cur);
          tokens = t;
        }
        if (tokens[0] === "4" && tokens[1]) {
          const n = parseFloat(tokens[1]);
          if (!Number.isNaN(n)) setLive(n);
        }
      };
    } catch {}
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  const value = live != null ? Math.max(1, Number(live)).toFixed(2) : null;

  return (
    <div className="inline-flex items-center">
      <div className="relative inline-flex items-center gap-3 px-3 py-1 rounded-lg bg-orange-500/20 border border-orange-400/30 text-orange-200 text-xs shadow-[0_0_20px_rgba(251,146,60,0.15)]">
        <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]" />
        <span className="tracking-wide blink-live-green font-semibold">Live</span>
        <div className="relative inline-flex justify-center items-center" style={{ minWidth: 88 }}>
          <AnimatePresence mode="popLayout">
            {value ? (
              <motion.span
                key={value}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="digital text-sm font-semibold text-orange-200 text-center"
              >
                {value}x
              </motion.span>
            ) : (
              <motion.span
                key="--"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-[11px] text-orange-200/70 text-center"
              >
                waiting…
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
