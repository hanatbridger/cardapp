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
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.setAttribute('data-play', '');
          io.disconnect();
        }
      },
      { threshold: 0.45 },
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
