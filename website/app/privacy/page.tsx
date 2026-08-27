import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What CardPulse stores, what it does not, and how to delete it.',
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Privacy</p>
      <h1>Privacy</h1>
      <p className="lede">Short, because there is not much to say.</p>

      <section className="block">
        <h2>What is stored</h2>
        <ul className="plain">
          <li>Your account identifier, from Sign in with Apple or Google.</li>
          <li>The cards on your list and any price targets you set.</li>
          <li>A push token, if you enabled notifications.</li>
        </ul>
      </section>

      <section className="block">
        <h2>What is not</h2>
        <p>
          CardPulse does not track you across other apps or websites, does not
          sell data, and carries no advertising SDK. Sign in with Apple keeps your
          email private if you choose to hide it.
        </p>
      </section>

      <section className="block">
        <h2>Deleting it</h2>
        <p>
          Profile, then Delete Account, inside the app. The account and its data
          are removed.
        </p>
      </section>
    </div>
  );
}
