import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Changelog',
  description: 'What changed in each release of CardPulse.',
  alternates: { canonical: '/changelog' },
};

const releases = [
  {
    version: '1.0.15',
    items: [
      'Collaboration promos are searchable by the name collectors use for them.',
      'Faster launch. The app no longer draws a second splash screen over the first.',
      'Price alerts run on raw prices, and the graded tab now says so rather than accepting an alert it cannot check.',
      'Sealed products browsed by type now show live market prices.',
    ],
  },
  {
    version: '1.0.14',
    items: [
      'Vintage cards are findable, including Gold Star cards searchable by name.',
      'Japanese cards appear for every search, with market prices and print history.',
      'Sealed products search the live catalogue, with price history.',
      'Price charts start building for any card you open, not just top-traded ones.',
    ],
  },
  {
    version: '1.0.13',
    items: [
      'Live eBay market dynamics on card pages.',
      'PSA 10 graded prices with price history and population data.',
      'News notifications arrive without opening the app.',
    ],
  },
];

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Changelog</p>
      <h1>What changed</h1>
      {releases.map((r) => (
        <section className="block" key={r.version}>
          <h2>{r.version}</h2>
          <ul className="plain">
            {r.items.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
