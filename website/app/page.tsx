import Link from 'next/link';

const APP_STORE =
  'https://apps.apple.com/us/app/cardpulse-card-tracker/id6762569336';

export default function Home() {
  return (
    <div className="shell stack">
      <section className="stack">
        <h1>Track what a Pokémon card is worth. Get a push when it hits your price.</h1>
        <p className="lede">
          CardPulse is an iPhone app. Add the cards you are watching to one list,
          see the current market price for each, set a target price, and get a
          notification when it is reached.
        </p>
        <a className="cta" href={APP_STORE}>Download on the App Store</a>
        <p className="note">
          Free for 5 cards and 3 alerts. $4.99 a month or $29.99 a year removes both caps.
        </p>
      </section>

      <section className="block">
        <h2>One list, not a collection</h2>
        <p>
          Most card apps track what you own. CardPulse tracks what you do not own
          yet. A card goes on the list because you are deciding whether to buy it,
          and it stays there until you do or until you stop caring.
        </p>
        <p>
          Each row shows the current raw market price, the change since yesterday,
          and your target if you set one. Tap a row for the price history chart,
          the PSA 10 spread, and where the number came from.
        </p>
      </section>

      <section className="block">
        <h2>Alerts</h2>
        <p>
          Set a price and a direction. Above or below. When the market price
          crosses it, the phone buzzes.
        </p>
        <p>
          Two honest details. While the app is open, alerts are checked against
          live prices. While it is closed, the check runs once a day, server-side
          — so a card that spikes and falls back inside the same day will not
          fire. And an alert is a notification, not an order. CardPulse does not
          buy anything, hold funds, or connect to a marketplace.
        </p>
        <p><Link href="/price-alerts">How alerts work</Link></p>
      </section>

      <section className="block">
        <h2>Coverage</h2>
        <dl className="facts">
          <div>
            <dt>English singles</dt>
            <dd>Raw market price for cards across the modern and vintage English sets.</dd>
          </div>
          <div>
            <dt>Japanese singles</dt>
            <dd>Japanese print runs are indexed separately with their own prices. Names are in English, so you can find them without typing Japanese.</dd>
          </div>
          <div>
            <dt>Vintage</dt>
            <dd>Base Set through the WOTC era, including Gold Star and other chase printings the market treats as distinct.</dd>
          </div>
          <div>
            <dt>Sealed</dt>
            <dd>Booster boxes, elite trainer boxes, bundles and tins, with market prices for the tracked catalogue.</dd>
          </div>
          <div>
            <dt>Daily movers</dt>
            <dd>The cards that moved most since yesterday, ranked by percentage. Sourced from the Collectrics daily leaderboard, not computed by CardPulse.</dd>
          </div>
          <div>
            <dt>News</dt>
            <dd>A trading card news feed, updated daily, with at most one push a day.</dd>
          </div>
        </dl>
      </section>

      <section className="block">
        <h2>Where the numbers come from</h2>
        <p>
          Raw single prices come from TCGplayer market data. PSA 10 prices come
          from completed eBay sales. Movers and sealed data come from Collectrics.
          None of these agree with each other, and the gaps are not errors — a
          TCGplayer market price is a weighted average of recent sales on one
          marketplace, an eBay sold price is what one buyer actually paid on
          another, and a price guide figure is usually neither.
        </p>
        <p><Link href="/methodology">Every source, and how often each updates</Link></p>
      </section>

      <section className="block">
        <h2>Price</h2>
        <div className="scroll">
          <table className="plans">
            <thead>
              <tr><th>&nbsp;</th><th>Free</th><th>Premium</th></tr>
            </thead>
            <tbody>
              <tr><td>Cards on the list</td><td>5</td><td>Unlimited</td></tr>
              <tr><td>Active price alerts</td><td>3</td><td>Unlimited</td></tr>
              <tr><td>Search, charts, history, news</td><td>Yes</td><td>Yes</td></tr>
            </tbody>
          </table>
        </div>
        <p className="note">
          $4.99 a month or $29.99 a year. Those two caps are the only difference
          between the tiers. Two cards are already on the list the first time you
          open the app, and they count toward the five.
        </p>
      </section>

      <section className="block">
        <h2>What CardPulse does not do</h2>
        <ul className="plain">
          <li>It does not buy, sell, or hold anything. Alerts are notifications.</li>
          <li>It does not tell you what a card will be worth. There is no forecast.</li>
          <li>It does not grade cards or estimate what a grade would come back as.</li>
          <li>It does not price graded cards for alerts. Alerts run on raw, ungraded prices.</li>
        </ul>
      </section>

      <section className="block">
        <a className="cta" href={APP_STORE}>Download on the App Store</a>
      </section>
    </div>
  );
}
