import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Search a card, put it on your list, set a target price, get a notification when it is reached.',
  alternates: { canonical: '/how-it-works' },
};

// The page and its HowTo schema both render from this array, so the
// steps a crawler is handed and the steps a reader sees cannot drift.
const STEPS = [
  {
    name: 'Find the card',
    text: 'Search by name. Vintage printings, Japanese print runs and sealed products come back in the same results as modern singles. Gold Star cards answer to their collector name, so “latias gold star” finds the card rather than every Latias ever printed.',
  },
  {
    name: 'Put it on the list',
    text: 'The list is the app. It holds the cards you are deciding about, each with its current raw market price and the change since yesterday. Prices refresh on their own.',
  },
  {
    name: 'Set a target',
    text: 'Pick a price and a direction. Above, if you are waiting to sell. Below, if you are waiting to buy. Alerts run on raw, ungraded prices.',
  },
  {
    name: 'Wait',
    text: 'When the market price crosses your target, the phone buzzes. Every alert that has fired stays in the notifications tab so you can see what tripped and when.',
  },
];

const schema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to track a Pokémon card price with CardPulse',
  description: 'Search a card, put it on your list, set a target price, get a notification when it is reached.',
  step: STEPS.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
};

export default function Page() {
  return (
    <div className="shell stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <p className="eyebrow">How it works</p>
      <h1>Four steps, in order</h1>
      <p className="lede">Nothing to configure. No account required to look around.</p>

      {STEPS.map((s, i) => (
        <section className="block" key={s.name}>
          <h2>
            {i + 1}. {s.name}
          </h2>
          <p>{s.text}</p>
        </section>
      ))}
    </div>
  );
}
