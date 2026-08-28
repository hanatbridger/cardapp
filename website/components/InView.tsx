'use client';

import { useEffect, useRef } from 'react';

/**
 * Stamps data-play on its element the first time it enters the
 * viewport, so time-based animation sequences (the notification
 * arrivals) start when seen rather than at page load. Fires once.
 */
export function InView({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Toggles rather than fires once: the animations are infinite loops
    // with a rest phase, and this just pauses them off-screen. A loop
    // can never be "missed" the way a one-shot can.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) el.setAttribute('data-play', '');
          else el.removeAttribute('data-play');
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} {...rest}>
      {children}
    </div>
  );
}
