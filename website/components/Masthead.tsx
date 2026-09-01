'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BrandMark } from './BrandMark';

/**
 * Sticky header that hides on downward scroll and returns on the first
 * upward scroll — the one behavior on the site that needs JavaScript,
 * since CSS scroll timelines cannot express direction. Server-rendered
 * like any client component, so the nav links stay in the crawled HTML.
 */
export function Masthead() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const el = ref.current;
      if (!el) return;
      const y = window.scrollY;
      // Capsule state: detached shadow once the page is moving.
      if (y > 14) el.setAttribute('data-scrolled', '');
      else el.removeAttribute('data-scrolled');
      // Near the top the bar is always shown; below that, direction rules.
      // The 8px deadband stops trackpad jitter from flickering it.
      if (y < 96) {
        el.removeAttribute('data-hidden');
      } else if (y > last + 8) {
        el.setAttribute('data-hidden', '');
      } else if (y < last - 8) {
        el.removeAttribute('data-hidden');
      }
      last = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="masthead" ref={ref}>
      <div className="inner">
        <Link href="/" className="brand">
          <BrandMark size={34} />
          CardPulse
        </Link>
        <nav>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/price-alerts">Alerts</Link>
          <Link href="/methodology">Sources</Link>
          <Link href="/pricing">Price</Link>
        </nav>
        <a
          className="pill-cta"
          href="https://apps.apple.com/us/app/cardpulse-card-tracker/id6762569336"
        >
          Get the app
        </a>
      </div>
    </header>
  );
}
