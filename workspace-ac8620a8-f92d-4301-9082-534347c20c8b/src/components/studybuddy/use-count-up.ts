"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

interface CountUpOptions {
  /** Animation duration in seconds (default 1.2) */
  duration?: number;
  /** Decimal places in the displayed value (default 0) */
  decimals?: number;
  /** Start delay in seconds (default 0) */
  delay?: number;
}

/**
 * Animated count-up hook backed by framer-motion's `animate()`.
 * Starts when the attached element scrolls into view (or immediately if
 * already in view), re-runs whenever `target` changes (e.g. data load).
 *
 * Usage:
 *   const { ref, display } = useCountUp(stats?.streak ?? 0);
 *   <span ref={ref}>{display}</span>
 */
export function useCountUp(target: number, options: CountUpOptions = {}) {
  const { duration = 1.2, decimals = 0, delay = 0 } = options;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);
  const lastAnimated = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    // Skip re-animating to the exact same target (e.g. re-renders).
    if (lastAnimated.current === target) return;
    lastAnimated.current = target;

    const controls = animate(0, target, {
      duration: target === 0 ? 0.01 : duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setValue(v),
      onComplete: () => setValue(target),
    });
    return () => controls.stop();
  }, [inView, target, duration, delay]);

  return { ref, display: value.toFixed(decimals), value };
}
