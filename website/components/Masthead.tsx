'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  // Narrow screens fold the links behind a toggle. The links stay in the
  // server-rendered HTML either way — hidden by CSS, never unmounted — so
  // crawlers read the same nav at every width.
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // A navigation closes the menu, or it stays open over the page you
  // just asked for.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Widening past the breakpoint hides the toggle; an open state left
    // behind would reappear the next time the window narrows.
    const wide = window.matchMedia('(min-width: 881px)');
    const onWide = () => wide.matches && setOpen(false);
    // A tap anywhere outside the bar dismisses it, the way every other
    // menu on a phone behaves.
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

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
    <header className="masthead" ref={ref} data-menu-open={open ? '' : undefined}>
      <div className="inner">
        <Link href="/" className="brand">
          <BrandMark size={34} />
          <span className="brand-word">CardPulse</span>
        </Link>
        <nav id="site-nav" data-open={open ? '' : undefined} onClick={() => setOpen(false)}>
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
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
