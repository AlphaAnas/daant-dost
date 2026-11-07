import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { scoreColor } from "./labels";

// The overall score, counting up as the ring fills.
const ScoreRing = ({ score, size = 168 }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - start) / 1200);
      setN(Math.round(score * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 168 168" className="h-full w-full -rotate-90">
        <circle cx="84" cy="84" r={r} fill="none" stroke="#E8EEF6" strokeWidth="12" />
        <motion.circle
          cx="84"
          cy="84"
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-semibold tabular-nums">{n}</span>
        <span className="text-sm font-bold text-ink-faint">out of 100</span>
      </div>
    </div>
  );
};

export default ScoreRing;
