import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns since added',
  description:
    'CardPulse records the market price the moment you add a card, then shows what it has made or lost since — today and in total, with a push at plus or minus 20%.',
  alternates: { canonical: '/returns' },
};

// One question, one answer, used for both the page and its FAQPage
// schema — so what a crawler is handed and what a reader sees can never
// drift apart.
const FAQ = [
  {
    q: 'How do I track what a Pokémon card is worth over time?',
    a: 'Add the card to your CardPulse watchlist. The app records the market price at that moment and keeps a daily close for the card from then on, so every later price has something to be measured against. The card page shows the starting price, the date, and the return since.',
  },
  {
    q: 'How much has my card gone up since I added it?',
    a: 'Total return is the current market price minus the price recorded when you added the card, shown in dollars and percent. Today’s return is the same arithmetic against yesterday’s close rather than against your starting price.',
  },
  {
    q: 'Where does the starting price come from?',
    a: 'It is the live market price on screen at the moment you tapped add — observed, never estimated. If the price had not loaded yet, CardPulse waits and uses the first live price instead, and dates the baseline to then.',
  },
  {
    q: 'Does CardPulse notify me when a card moves a lot?',
    a: 'Yes. Premium sends one push when a card is up 20% or down 20% against its starting price, so a card that moves while you are not looking still reaches you.',
  },
  {
    q: 'Is returns since added free?',
    a: 'The card shows on the free tier, but its figures are placeholders behind an upgrade prompt. Reading them, and the 20% pushes, are part of Premium at $4.99 a month or $29.99 a year.',
  },
];

const schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function Page() {
  return (
    <div className="shell stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <p className="eyebrow">Returns</p>
      <h1>What a card has made since you added it</h1>
      <p className="lede">
        A watchlist tells you what a card is worth. This tells you what it has
        done for you.
      </p>

      <section className="block">
        <h2>How do I track what a Pokémon card is worth over time?</h2>
        <p>
          Add the card to your watchlist. CardPulse records the market price at
          that moment and keeps a daily close for the card from then on, so every
          later price has something to be measured against. The card page then
          shows the starting price, the date, and the return since.
        </p>
      </section>

      <section className="block">
        <h2>The two figures</h2>
        <dl className="facts">
          <div>
            <dt>Today&rsquo;s return</dt>
            <dd>Current market price against yesterday&rsquo;s close, in dollars and percent.</dd>
          </div>
          <div>
            <dt>Total return</dt>
            <dd>Current market price against the price recorded when you added the card.</dd>
          </div>
        </dl>
        <p className="note">
          A card with no close recorded yet shows an em dash for today&rsquo;s
          return rather than a zero. Zero would read as &ldquo;flat today&rdquo;,
          and the truth is that we do not know yesterday&rsquo;s number for that
          card yet.
        </p>
      </section>

      <section className="block">
        <h2>Where the starting price comes from</h2>
        <p>
          The live market price on screen at the moment you tapped add. It is
          observed, never estimated, and never backdated to a purchase we did not
          see. If the price had not loaded when you added the card, CardPulse
          waits and uses the first live price instead, dating the baseline to
          then — so the figure is always measured from a price that actually
          existed.
        </p>
      </section>

      <section className="block">
        <h2>The 20% push</h2>
        <p>
          Premium sends one notification when a card is up 20% or down 20%
          against its starting price. It fires once per direction per card, so a
          card hovering around the threshold does not notify you repeatedly.
        </p>
      </section>

      <section className="block">
        <h2>What this is not</h2>
        <p>
          It is not a portfolio ledger. CardPulse does not know what you paid, and
          does not ask — the baseline is a market price on a date, not a purchase
          record. It is not tax reporting, it is not a valuation of your
          collection, and a return figure here is not advice to buy or sell
          anything.
        </p>
      </section>

      <section className="block">
        <h2>Price</h2>
        <p>
          The card is visible on the free tier, with its figures shown as
          placeholders behind an upgrade prompt. Reading them, and the 20% pushes,
          are part of Premium at $4.99 a month or $29.99 a year.
        </p>
      </section>
    </div>
  );
}
