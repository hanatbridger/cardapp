import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { Masthead } from '@/components/Masthead';
import { BrandMark } from '@/components/BrandMark';
import './globals.css';

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://getcardpulse.app'),
  title: {
    default: 'CardPulse — Pokémon card price tracker with target-price alerts',
    template: '%s — CardPulse',
  },
  description:
    'iPhone app. One list of the cards you are watching, the current market price for each, and a push notification when a card hits the price you set. Free for 5 cards and 3 alerts.',
  alternates: { canonical: '/' },
  // Google Search Console ownership, for hanwong118@gmail.com. A public
  // value by design — it proves control of the site by being published
  // on it. Removing it un-verifies the property.
  verification: { google: 'jw-8K3fRMFiY3Z1H_u0NjrrPrKphtYFb2lK94dMgT38' },
  openGraph: {
    type: 'website',
    siteName: 'CardPulse',
    title: 'CardPulse — Pokémon card price tracker with target-price alerts',
    description:
      'Track what a Pokémon card is worth. Get a push when it hits your price.',
  },
};

const APP_STORE =
  'https://apps.apple.com/us/app/cardpulse-card-tracker/id6762569336';

// Organization + SoftwareApplication. No aggregateRating — the app has one
// rating and asserting a rating figure with n=1 is the kind of claim that
// gets structured data ignored wholesale.
const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://getcardpulse.app/#org',
      name: 'CardPulse',
      url: 'https://getcardpulse.app',
      // the App Store listing is the entity's other public record --
      // linking them is what lets crawlers reconcile the two
      sameAs: [APP_STORE],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'CardPulse',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'iOS',
      url: APP_STORE,
      publisher: { '@id': 'https://getcardpulse.app/#org' },
      // What the app actually does, in the app's own words. Without this
      // the entity is three prices and a category — nothing a rich result
      // or an assistant can enumerate.
      featureList: [
        'Watchlist of trading cards with live market prices',
        'Target-price alerts with push notifications',
        'Returns since added: what a card has made or lost since you added it',
        'eBay market dynamics: active listings, sales a day, demand pressure',
        'Daily price history charts for raw and PSA 10 cards',
        'Grading verdict: expected value of sending a card to PSA',
        'Trading card news with push notifications',
      ],
      offers: [
        { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
        { '@type': 'Offer', price: '4.99', priceCurrency: 'USD', name: 'Premium monthly' },
        { '@type': 'Offer', price: '29.99', priceCurrency: 'USD', name: 'Premium yearly' },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={grotesk.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <Masthead />
        <main>{children}</main>
        <footer className="foot">
          <div className="inner">
            <div className="foot-brand">
              <BrandMark size={24} />
              CardPulse
            </div>
            <nav>
              <Link href="/about">About</Link>
              <Link href="/changelog">Changelog</Link>
              <Link href="/support">Support</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
            <p>
              CardPulse is an independent tool. Pokémon and all related names and
              images are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc.
              CardPulse is not affiliated with or endorsed by them.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
