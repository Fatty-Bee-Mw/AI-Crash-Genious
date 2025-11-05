import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function FitToViewport({ children, minScale = 0.55, maxScale = 1 }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const lockedRef = useRef(null); // lock to initial step and only decrease thereafter

  const recompute = () => {
    if (!outerRef.current || !innerRef.current) return;
    const viewportH = window.innerHeight;
    // Measure natural content height (unscaled)
    innerRef.current.style.transform = "none";
    const contentH = innerRef.current.scrollHeight;
    // Compute scale to fit
    const sRaw = Math.min(maxScale, Math.max(minScale, viewportH / Math.max(1, contentH)));
    // Snap to discrete steps to reduce jitter/blur and keep a consistent look
    const steps = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];
    let s = steps[0];
    for (const st of steps) { if (st <= sRaw) s = st; }
    // tiny headroom to avoid later overflow when content nudges
    s = Math.max(minScale, Math.min(maxScale, s * 0.995));
    // lock to first computed scale and DO NOT decrease on content changes (prevents shrinking)
    if (lockedRef.current == null) lockedRef.current = s;
    const sLocked = lockedRef.current;
    setScale(sLocked);
    // Apply transform and fix outer height to viewport so it always fills screen
    innerRef.current.style.transform = `scale(${sLocked})`;
    innerRef.current.style.transformOrigin = "top center";
    outerRef.current.style.height = `${viewportH}px`;
    outerRef.current.style.overflowY = 'auto';
  };

  useLayoutEffect(() => {
    // run multiple times to catch late layout changes (fonts, async data)
    recompute();
    const raf1 = requestAnimationFrame(recompute);
    const t1 = setTimeout(recompute, 80);
    const t2 = setTimeout(recompute, 200);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    const onLoad = () => recompute();
    window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return (
    <div ref={outerRef} style={{ width: "100%" }}>
      <div ref={innerRef} style={{ width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
