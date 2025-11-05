import { motion, AnimatePresence } from "framer-motion";

export default function Ticker({ rounds }) {
  const items = rounds.slice(0, 50);

  function colorClass(value) {
    // Aviator-style tiers
    if (value >= 1000) return "bg-orange-500 text-white border-orange-400";    // 1000x+
    if (value >= 100) return "bg-red-600 text-white border-red-500";           // 100–999x
    if (value >= 10) return "bg-pink-600 text-white border-pink-500";          // 10–99x
    if (value >= 2) return "bg-purple-600 text-white border-purple-500";       // 2–9.99x
    return "bg-blue-500 text-white border-blue-400";                            // <2x (e.g., 1x, 1.1x)
  }

  function chipStyle(value) {
    // Inline colors to guarantee solid backgrounds even if utility classes are overridden/purged
    if (value >= 1000) return { backgroundColor: "#f97316", borderColor: "#fb923c", color: "#ffffff" };
    if (value >= 100) return { backgroundColor: "#dc2626", borderColor: "#ef4444", color: "#ffffff" };
    if (value >= 10) return { backgroundColor: "#db2777", borderColor: "#ec4899", color: "#ffffff" };
    if (value >= 2) return { backgroundColor: "#7c3aed", borderColor: "#8b5cf6", color: "#ffffff" };
    return { backgroundColor: "#3b82f6", borderColor: "#60a5fa", color: "#ffffff" };
  }

  return (
    <div className="rounded-2xl p-4 border border-emerald-400/20 glass-card shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      <div className="text-sm text-slate-100 mb-2">Recent Multipliers</div>
      <div className="flex gap-2 overflow-x-auto py-2">
        <AnimatePresence>
          {items.map((r, i) => {
            const v = Number(r.final) || 0;
            return (
              <motion.div
                key={r.time + "-" + i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full font-semibold text-sm border ${colorClass(v)}`}
                style={chipStyle(v)}
                title={`${v}x`}
              >
                {v}x
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
