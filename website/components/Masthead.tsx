'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BrandMark } from './BrandMark';

/**
 * Sticky header. It stays on screen the whole way down — the Get the app
 * button is the page's one call to action, and a bar that hides on scroll
 * takes it away precisely while someone is reading toward it.
 *
 * The JavaScript here does one thing: flag that the page has moved, so
 * the capsule can frost itself. That cannot be done in CSS alone at the
 * top of a document. Server-rendered like any client component, so the
 * nav links stay in the crawled HTML.
 */
export function Masthead() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const el = ref.current;
      if (!el) return;
      // Capsule state: frost and detached shadow once the page is moving,
      // which is what keeps the bar legible over the content beneath it.
      if (window.scrollY > 14) el.setAttribute('data-scrolled', '');
      else el.removeAttribute('data-scrolled');
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    // Run once: a reload partway down a page starts already scrolled.
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="masthead" ref={ref}>
      <div className="inner">
        <Link href="/" className="brand">
          <BrandMark size={34} />
          <span className="brand-word">CardPulse</span>
        </Link>
        <nav>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/price-alerts">Alerts</Link>
          <Link href="/returns">Returns</Link>
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
