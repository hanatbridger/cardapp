import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'About',
  description: 'CardPulse is built and maintained by one developer.',
  alternates: { canonical: '/about' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">About</p>
      <h1>Who makes this</h1>
      <p className="lede">
        CardPulse is built and maintained by Han Wong, independently.
      </p>

      <section className="block">
        <h2>Why it exists</h2>
        <p>
          Checking whether a card has reached a price you would pay meant opening
          three marketplaces and doing the comparison by hand, repeatedly, for
          every card you were thinking about. CardPulse is that loop, automated
          down to one list and a notification.
        </p>
      </section>

      <section className="block">
        <h2>Independence</h2>
        <p>
          CardPulse is not affiliated with, endorsed by, or sponsored by Nintendo,
          Creatures Inc., GAME FREAK inc., The Pokémon Company, TCGplayer, eBay or
          PSA. It takes no commission on any sale and links to no marketplace
          affiliate programme.
        </p>
      </section>
    </div>
  );
}
