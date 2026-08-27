import type { Metadata } from 'next';
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
    </div>
  );
}
