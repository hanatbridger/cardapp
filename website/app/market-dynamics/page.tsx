import type { Metadata } from 'next';
import { Faq } from '@/components/Faq';

export const metadata: Metadata = {
  title: 'Market dynamics',
  description:
    'What demand pressure and supply saturation measure on a CardPulse card page, where the numbers come from, and how far to trust them.',
  alternates: { canonical: '/market-dynamics' },
};

// Everything here describes what the panel displays, not how its two
// headline metrics are derived: both are supplied upstream, and this page
// does not claim a formula it cannot show.
const FAQ = [
  {
    q: 'What does demand pressure mean for a trading card?',
    a: 'It is a seven-day demand measure over a card’s eBay listings, shown as a percentage on a scale from heavy supply to very tight. Higher means a tighter market.',
  },
  {
    q: 'What is supply saturation?',
    a: 'An index comparing a card’s current eBay supply with its own baseline. 1.0 is baseline. Above 1.0 supply is loosening; below it, supply is tightening.',
  },
  {
    q: 'Where does CardPulse get market dynamics data?',
    a: 'From Collectrics, which derives these metrics from eBay listing data. CardPulse displays them; it does not compute demand pressure or supply saturation itself.',
  },
  {
    q: 'How accurate are market dynamics figures?',
    a: 'Directionally accurate, not exact. Sales a day is an estimate from listing history, and a card without live figures shows seeded sample data, labelled as sample data, rather than a gap.',
  },
];

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Market</p>
      <h1>Market dynamics</h1>
      <p className="lede">
        The price tells you where a card is. This panel is a read on which way
        the market under it is leaning.
      </p>

      <section className="block">
        <h2>What the panel shows</h2>
        <dl className="facts">
          <div>
            <dt>Active</dt>
            <dd>Listings live on eBay, averaged over seven days and compared with the thirty-day average.</dd>
          </div>
          <div>
            <dt>New a day</dt>
            <dd>New listings appearing each day, seven-day average against thirty.</dd>
          </div>
          <div>
            <dt>Sold a day</dt>
            <dd>Estimated sales each day, seven-day average against thirty. Days the source filled in by interpolation are left out rather than counted.</dd>
          </div>
        </dl>
      </section>

      <section className="block">
        <h2>Demand pressure</h2>
        <p>
          A seven-day demand measure over the card&rsquo;s eBay listings, shown
          as a percentage. The gauge runs from heavy supply at one end to very
          tight at the other. Higher reads as a tighter market.
        </p>
      </section>

      <section className="block">
        <h2>Supply saturation</h2>
        <p>
          An index of the card&rsquo;s current eBay supply against its own
          baseline, where 1.0 is baseline. The gauge runs from tightening to
          loosening: below 1.0 supply is drying up, above it supply is building.
        </p>
      </section>

      <section className="block">
        <h2>Where it comes from</h2>
        <p>
          Collectrics supplies the listing counts, the sales estimates and both
          indices, derived from eBay listing data. CardPulse displays them and
          does not compute demand pressure or supply saturation itself, so this
          page describes what they show rather than claiming a formula.
        </p>
        <p className="note">
          A card Collectrics has no live figures for shows seeded sample data,
          badged as sample data on the card page. The panel is labelled
          directionally accurate, not exact, and that is the right amount of
          trust to give it.
        </p>
      </section>

      <section className="block">
        <h2>Price</h2>
        <p>Market dynamics are the same on the free tier and on Premium.</p>
      </section>

      <Faq items={FAQ} />
    </div>
  );
}
