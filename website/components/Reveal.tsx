'use client';

import { useEffect, useRef } from 'react';

/**
 * Marks its subtree with `data-in` the first time it comes into view, so
 * CSS can run an entrance off a plain transition or keyframe.
 *
 * The site's other entrances use `animation-timeline: view()`, which in
 * Chrome resolves to a zero-length duration here: the animation reports
 * progress 1 and a finished play state while the element is still two
 * thousand pixels below the fold, so it paints its end state and nothing
 * ever moves. An observer plus a class is the version that runs.
 *
 * One-shot on purpose — a gauge that refills every time it scrolls past
 * reads as a glitch, not as a flourish.
 */
export function Reveal({
  children,
  threshold = 0.35,
  className,
}: {
  children: React.ReactNode;
  /** How much of the block must be visible before it plays. */
  threshold?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduce Motion gets the finished state immediately: the numbers and
    // the bars are content, so they must arrive either way.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.setAttribute('data-in', '');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-in', '');
          io.unobserve(entry.target);
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
