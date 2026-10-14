import React, { useEffect, useRef, useState } from 'react';

// Número que "conta" até o valor na carga e quando muda (padrão Junco §3.7: ≤600 ms, sem loop,
// tabular-nums, e valor direto com prefers-reduced-motion).
export const CountUp: React.FC<{ value: number; format?: (n: number) => string; duration?: number }> = ({ value, format = n => String(Math.round(n)), duration = 600 }) => {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="tabular-nums">{format(shown)}</span>;
};
