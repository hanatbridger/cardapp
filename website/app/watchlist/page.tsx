import type { Metadata } from 'next';
import Link from 'next/link';
import { Faq } from '@/components/Faq';

export const metadata: Metadata = {
  title: 'Pokémon card watchlist',
  description:
    'The CardPulse watchlist is a list of the Pokémon cards and sealed products you are watching, each with its current market price and the day’s change. Free for 5 items.',
  alternates: { canonical: '/watchlist' },
};

// Each answer restates something the sections above already say — no
// question here is answered only in the schema.
const FAQ = [
  {
    q: 'What is a Pokémon card watchlist?',
    a: 'A list of the cards you want to keep an eye on, with the current market price for each. In CardPulse it is the centre of the app: cards and sealed products you add sit on the home screen with their current price and the day’s change, and returns since added is measured on them. Price alerts can be set on any card, on the watchlist or not.',
  },
  {
    q: 'How many cards can I watch for free?',
    a: 'Five. Cards and sealed products share the same five slots. Premium removes the cap, at $4.99 a month or $29.99 a year.',
  },
  {
    q: 'Can I add booster boxes and other sealed products to my watchlist?',
    a: 'Yes. Searching by name returns sealed products such as booster boxes and Elite Trainer Boxes alongside cards, and they go on the same watchlist.',
  },
  {
    q: 'Is CardPulse a collection tracker?',
    a: 'No. CardPulse does not record which cards you own, how many copies, their condition, or what you paid. The watchlist is a list of cards you are watching, whether you own them or not.',
  },
  {
    q: 'What happens when a card on my watchlist changes price?',
    a: 'The row shows the new market price and the day’s change. If you set a price alert on the card, you get a push when it crosses your target. On Premium, you also see the return since you added the card and get one push at plus or minus 20%.',
  },
];

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Watchlist</p>
      <h1>A watchlist for Pokémon cards</h1>
      <p className="lede">
        The cards you are watching, what each is worth today, and how much it
        moved since yesterday.
      </p>

      <section className="block">
        <h2>What is a watchlist in CardPulse?</h2>
        <p>
          A list of the cards and sealed products you want to keep an eye on,
          each shown with its current market price and the day&rsquo;s change.
          It is the centre of the app: the watchlist is on the home screen, and
          returns since added is measured on the items in it. Price alerts can
          be set on any card, including those on it.
          Raw card prices are TCGplayer market prices, with JustTCG as a
          fallback for cards TCGplayer does not price; sealed prices and the
          rest are set out on the <Link href="/methodology">sources page</Link>.
        </p>
      </section>

      <section className="block">
        <h2>How do I add cards to it?</h2>
        <p>
          Search, open the card, and add it. Search works three ways: by card
          name, by set, or by illustrator. A search in the Cards tab also
          returns sealed products whose name matches, such as a set&rsquo;s
          booster box or Elite Trainer Box, in their own section below the
          cards, and they go on the same watchlist. The whole flow, from search to alert, is laid out in{' '}
          <Link href="/how-it-works">four steps</Link>.
        </p>
        <p className="note">
          A new install starts with two example cards on the watchlist, so the
          home screen is not empty on first open. Removing them frees their
          slots.
        </p>
      </section>

      <section className="block">
        <h2>What does each row show?</h2>
        <dl className="facts">
          <div>
            <dt>Market price</dt>
            <dd>The current market price for the card or product.</dd>
          </div>
          <div>
            <dt>Day change</dt>
            <dd>The move against the previous day&rsquo;s price, in percent.</dd>
          </div>
          <div>
            <dt>Grade label</dt>
            <dd>
              Which price the row is tracking — Raw for an ungraded card. Sealed
              rows show the product type instead.
            </dd>
          </div>
        </dl>
        <p className="note">
          A sealed product with no live price source is labelled Sample data on
          its row, rather than showing an unlabelled number.
        </p>
      </section>

      <section className="block">
        <h2>How many items does the free tier hold?</h2>
        <p>
          Five. Cards and sealed products share the same five slots, so three
          cards and two booster boxes fill it. Premium removes the cap, along
          with the limit of three active alerts (price and grading alerts share
          the three), at $4.99 a month or $29.99 a year. See <Link href="/pricing">pricing</Link>.
        </p>
      </section>

      <section className="block">
        <h2>Is it a collection tracker?</h2>
        <p>
          No. A collection tracker records what you own: how many copies, in
          what condition, bought at what price. CardPulse records none of that.
          The watchlist holds cards you are watching, whether you own them, want
          them, or are waiting to sell them. It has no field for quantity or
          condition, and it does not know what you paid and does not ask.
        </p>
      </section>

      <section className="block">
        <h2>What happens when a watched card moves?</h2>
        <p>
          The row updates with the new market price and the day&rsquo;s change.
          Three features build on that:
        </p>
        <dl className="facts">
          <div>
            <dt>Price alert</dt>
            <dd>
              A target price and a direction on one card. When the raw market
              price crosses it, you get a push. Free keeps three active alerts, shared with grading
              alerts. See{' '}
              <Link href="/price-alerts">how price alerts work</Link>.
            </dd>
          </div>
          <div>
            <dt>Return since added</dt>
            <dd>
              Premium. The current price against the price recorded when you
              added the card, in dollars and percent.
            </dd>
          </div>
          <div>
            <dt>The 20% push</dt>
            <dd>
              Premium. One notification when a card is up 20% or down 20%
              against the price recorded when you added it. See{' '}
              <Link href="/returns">returns since added</Link>.
            </dd>
          </div>
        </dl>
      </section>

      <Faq items={FAQ} />
    </div>
  );
}
