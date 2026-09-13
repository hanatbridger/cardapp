import type { Metadata } from 'next';
import Link from 'next/link';

// The only address that receives mail for CardPulse. Mirrors SUPPORT_EMAIL
// in app/help.tsx and CONTACT_EMAIL in app/privacy.tsx — keep them in step.
const CONTACT = 'hanwong118@gmail.com';

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
          lets you attach an image and reaches the developer directly. By email,{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a> reaches the same person.
        </p>
      </section>

      <section className="block">
        <h2>A price looks wrong</h2>
        <p>
          Check which source the number came from on the card screen first. A raw
          TCGplayer market price and an eBay asking price for the same card can
          differ by a lot without either being wrong &mdash; the eBay figures in
          the app come from live listings, not from completed sales. If the number still looks
          off, send it through the feedback form with the card name and set.
        </p>
      </section>

      <section className="block">
        <h2>Deleting your account</h2>
        <p>
          Profile, then the ACCOUNT section, then Delete Account. It removes the
          account and the alerts and feedback stored against it.{' '}
          <Link href="/delete-account">Delete your CardPulse account</Link> has
          the full steps, the email route if the app is already uninstalled, and
          what remains afterwards.
        </p>
      </section>
    </div>
  );
}
