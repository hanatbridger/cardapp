import type { Metadata } from 'next';
import { Faq } from '@/components/Faq';

// Each answer restates something the sections above already say — no
// question here is answered only in the schema.
const FAQ = [
  {
    q: 'How do I get notified when a Pokémon card hits a price?',
    a: 'Put the card on your CardPulse list, set a target price and a direction — above if you are waiting to sell, below if you are waiting to buy. When the raw market price crosses the target, the app sends a push notification.',
  },
  {
    q: 'How often does CardPulse check a price alert?',
    a: 'About once a minute while the app is open, on a schedule iOS controls while it is backgrounded, and once a day server-side while it is closed. A card that spikes and falls back inside one day, with the app closed, will not fire.',
  },
  {
    q: 'Can I set a price alert on a PSA 10 or graded card?',
    a: 'No. Alerts run on raw, ungraded prices only. There is no graded price feed behind them, so the app declines to set one rather than accept an alert it cannot honour.',
  },
  {
    q: 'Does a price alert buy or sell the card for me?',
    a: 'No. It is a notification. CardPulse does not place orders, hold funds, or connect to any marketplace.',
  },
];

export const metadata: Metadata = {
  title: 'How price alerts work',
  description: 'What a CardPulse price alert checks, how often it checks it, and what it will not catch.',
  alternates: { canonical: '/price-alerts' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Alerts</p>
      <h1>How price alerts work</h1>
      <p className="lede">
        Including the limits, because an alert you do not understand is worse
        than no alert.
      </p>

      <section className="block">
        <h2>What is checked</h2>
        <p>
          The raw, ungraded market price for the card. Not a graded price, not an
          average across grades, not a listing price. If you set a target of $300
          below, the alert fires when the raw market price is at or under $300.
        </p>
      </section>

      <section className="block">
        <h2>How often</h2>
        <dl className="facts">
          <div>
            <dt>App open</dt>
            <dd>Checked about once a minute against live prices.</dd>
          </div>
          <div>
            <dt>App backgrounded</dt>
            <dd>On a schedule iOS controls. iOS decides when a backgrounded app gets to run, and it is not guaranteed.</dd>
          </div>
          <div>
            <dt>App closed</dt>
            <dd>Once a day, server-side.</dd>
          </div>
        </dl>
        <p className="note">
          A card that spikes and falls back inside the same day, while the app is
          closed, will not fire. That is a real limitation and not a bug.
        </p>
      </section>

      <section className="block">
        <h2>Graded cards</h2>
        <p>
          Alerts do not run on PSA 10 or other graded prices. There is no graded
          price feed behind them, so the app declines to set one rather than
          accepting an alert it cannot honour.
        </p>
      </section>

      <section className="block">
        <h2>What an alert is not</h2>
        <p>
          It is a notification. CardPulse does not place orders, hold funds, or
          connect to any marketplace. Nothing is bought or sold on your behalf,
          ever.
        </p>
      </section>

      <Faq items={FAQ} />
    </div>
  );
}
