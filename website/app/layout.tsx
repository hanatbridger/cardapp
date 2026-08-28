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
  metadataBase: new URL('https://cardpulse.app'),
  title: {
    default: 'CardPulse — Pokémon card price tracker with target-price alerts',
    template: '%s — CardPulse',
  },
  description:
    'iPhone app. One list of the cards you are watching, the current market price for each, and a push notification when a card hits the price you set. Free for 5 cards and 3 alerts.',
  alternates: { canonical: '/' },
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
      '@id': 'https://cardpulse.app/#org',
      name: 'CardPulse',
      url: 'https://cardpulse.app',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'CardPulse',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'iOS',
      url: APP_STORE,
      publisher: { '@id': 'https://cardpulse.app/#org' },
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
