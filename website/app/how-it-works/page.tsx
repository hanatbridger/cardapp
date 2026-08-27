import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'How it works',
  description: 'Search a card, put it on your list, set a target price, get a notification when it is reached.',
  alternates: { canonical: '/how-it-works' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">How it works</p>
      <h1>Four steps, in order</h1>
      <p className="lede">Nothing to configure. No account required to look around.</p>

      <section className="block">
        <h2>1. Find the card</h2>
        <p>
          Search by name. Vintage printings, Japanese print runs and sealed
          products come back in the same results as modern singles. Gold Star
          cards answer to their collector name, so &ldquo;latias gold star&rdquo;
          finds the card rather than every Latias ever printed.
        </p>
      </section>

      <section className="block">
        <h2>2. Put it on the list</h2>
        <p>
          The list is the app. It holds the cards you are deciding about, each
          with its current raw market price and the change since yesterday.
          Prices refresh on their own.
        </p>
      </section>

      <section className="block">
        <h2>3. Set a target</h2>
        <p>
          Pick a price and a direction. Above, if you are waiting to sell. Below,
          if you are waiting to buy. Alerts run on raw, ungraded prices.
        </p>
      </section>

      <section className="block">
        <h2>4. Wait</h2>
        <p>
          When the market price crosses your target, the phone buzzes. Every
          alert that has fired stays in the notifications tab so you can see what
          tripped and when.
        </p>
      </section>
    </div>
  );
}
