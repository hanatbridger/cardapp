import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Support',
  description: 'How to get help with CardPulse, report a bug, or delete your account.',
  alternates: { canonical: '/support' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Support</p>
      <h1>Getting help</h1>

      <section className="block">
        <h2>Report something</h2>
        <p>
          The fastest route is inside the app: Profile, then Send Feedback. It
          attaches a screenshot and reaches the developer directly.
        </p>
      </section>

      <section className="block">
        <h2>A price looks wrong</h2>
        <p>
          Check which source the number came from on the card screen first. A raw
          TCGplayer market price and an eBay sold price for the same card can
          differ by a lot without either being wrong. If the number still looks
          off, send it through the feedback form with the card name and set.
        </p>
      </section>

      <section className="block">
        <h2>Deleting your account</h2>
        <p>
          Profile, then Delete Account, inside the app. It removes the account and
          its data. Nothing is retained afterwards.
        </p>
      </section>
    </div>
  );
}
