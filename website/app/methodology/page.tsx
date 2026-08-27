import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Where the prices come from',
  description: 'Every data source CardPulse uses, how often each updates, and where the numbers disagree.',
  alternates: { canonical: '/methodology' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Sources</p>
      <h1>Where the prices come from</h1>
      <p className="lede">
        Named, with their cadence and their limits. Card prices are not a single
        number and any app that implies otherwise is hiding something.
      </p>

      <section className="block">
        <h2>The sources</h2>
        <dl className="facts">
          <div>
            <dt>Raw single prices — TCGplayer market data</dt>
            <dd>A weighted average of recent sales on TCGplayer. It is not the lowest listing and not what any single buyer paid.</dd>
          </div>
          <div>
            <dt>PSA 10 prices — completed eBay sales</dt>
            <dd>What graded copies actually sold for. Thinner data than raw, because far fewer graded copies trade.</dd>
          </div>
          <div>
            <dt>Daily movers and sealed — Collectrics</dt>
            <dd>The daily leaderboard, ranked on day-over-day change. CardPulse re-sorts it; it does not compute it.</dd>
          </div>
          <div>
            <dt>Card catalogue — pokemontcg.io</dt>
            <dd>Set names, numbers, rarities, artists and images for English cards.</dd>
          </div>
          <div>
            <dt>Japanese catalogue — TCGplayer&rsquo;s Japan product line</dt>
            <dd>Japanese print runs with English names and their own market prices.</dd>
          </div>
        </dl>
      </section>

      <section className="block">
        <h2>Why the numbers disagree</h2>
        <p>
          A TCGplayer market price, an eBay sold price and a price guide figure
          measure different things on different marketplaces over different
          windows. A 20% gap between them is normal and is not evidence that one
          is wrong. Where CardPulse shows a number, it shows which source it came
          from.
        </p>
      </section>

      <section className="block">
        <h2>What is estimated</h2>
        <p>
          Price history is built from daily snapshots. A card that has only
          recently been opened in the app will have a short history, because the
          series starts when the card is first observed. Charts state the range
          they cover rather than implying more.
        </p>
      </section>
    </div>
  );
}
