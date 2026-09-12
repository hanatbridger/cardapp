import type { Metadata } from 'next';
import { Faq } from '@/components/Faq';

const FAQ = [
  {
    q: 'Is CardPulse free?',
    a: 'Yes. The free tier holds five cards or sealed products and three active price alerts, with no ads. Search, price history, market dynamics, recent sales, daily movers, the grading verdict and the news feed are the same on both tiers.',
  },
  {
    q: 'What does CardPulse Premium add?',
    a: 'An unlimited watchlist, unlimited price alerts, returns since added with a push at plus or minus 20%, and AI predictions. Premium is $4.99 a month or $29.99 a year.',
  },
  {
    q: 'Can I see returns since added without Premium?',
    a: 'The card shows on the free tier, but its figures are placeholders behind an upgrade prompt. Reading them, and the 20% pushes, are part of Premium.',
  },
  {
    q: 'How do I cancel CardPulse Premium?',
    a: 'In your Apple Account settings. The subscription renews automatically unless auto-renew is turned off at least 24 hours before the end of the current period.',
  },
];

export const metadata: Metadata = {
  title: 'Price',
  description: 'Free for 5 cards and 3 alerts. Premium is $4.99 a month or $29.99 a year, removes both caps, and adds returns since added and AI predictions.',
  alternates: { canonical: '/pricing' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Price</p>
      <h1>Two caps, and a subscription that removes them</h1>
      <p className="lede">
        Two caps, and two features that read your own numbers back to you.
        Everything else is the same on both tiers.
      </p>

      <section className="block">
        <div className="scroll">
          <table className="plans">
            <thead>
              <tr><th>&nbsp;</th><th>Free</th><th>Premium</th></tr>
            </thead>
            <tbody>
              <tr><td>Cards and sealed products on the list</td><td>5 total</td><td>Unlimited</td></tr>
              <tr><td>Active price alerts</td><td>3</td><td>Unlimited</td></tr>
              <tr><td><a href="/returns">Returns since added</a></td><td>Preview</td><td>Yes, with 20% pushes</td></tr>
              <tr><td>AI predictions</td><td>Preview</td><td>Yes</td></tr>
              <tr><td>Search, set and artist pages</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Price history, market dynamics, recent sales</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Daily movers, news feed, grading verdict</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Ads</td><td>None</td><td>None</td></tr>
            </tbody>
          </table>
        </div>
        <p className="note">
          Preview means the card is there with its layout intact and its
          figures replaced by placeholders behind the upgrade prompt. $4.99 a month
          or $29.99 a year. Cards and sealed products share the same
          five free slots. Two cards are already on the list the first time you
          open the app and they count toward the five.
        </p>
      </section>

      <section className="block">
        <h2>Billing</h2>
        <p>
          Payment is charged to your Apple Account at confirmation of purchase.
          The subscription renews automatically unless auto-renew is turned off at
          least 24 hours before the end of the current period. Manage or cancel it
          in your Apple Account settings.
        </p>
      </section>

      <Faq items={FAQ} />
    </div>
  );
}
