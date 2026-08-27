import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms of use for CardPulse.',
  alternates: { canonical: '/terms' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Terms</p>
      <h1>Terms of use</h1>

      <section className="block">
        <h2>What CardPulse provides</h2>
        <p>
          Price information gathered from third-party marketplaces, shown for
          reference. It is not a valuation, an appraisal, an offer, or financial
          advice. Prices change and may be stale, incomplete, or wrong.
        </p>
      </section>

      <section className="block">
        <h2>Decisions are yours</h2>
        <p>
          Any decision to buy, sell, grade or hold a card is yours alone.
          CardPulse accepts no liability for the outcome of those decisions.
        </p>
      </section>

      <section className="block">
        <h2>Subscriptions</h2>
        <p>
          Premium is billed through the App Store. Payment is charged to your
          Apple Account at confirmation of purchase and renews automatically
          unless auto-renew is turned off at least 24 hours before the end of the
          current period. Refunds are handled by Apple.
        </p>
      </section>

      <section className="block">
        <h2>Trademarks</h2>
        <p>
          Pokémon and all related names and images are trademarks of Nintendo,
          Creatures Inc. and GAME FREAK inc. CardPulse is an independent tool and
          is not affiliated with or endorsed by them, or by TCGplayer, eBay or PSA.
        </p>
      </section>
    </div>
  );
}
