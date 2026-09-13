import type { Metadata } from 'next';
import Link from 'next/link';

// This page is the public mirror of the in-app policy at app/privacy.tsx.
// When one changes the other has to change with it — a store reviewer reads
// both, and the app is where the binding version lives.
const CONTACT = 'hanwong118@gmail.com';
const LAST_UPDATED = 'September 12, 2026';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What CardPulse stores, who processes it, how long it is kept, and how to delete it.',
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Privacy</p>
      <h1>Privacy</h1>
      <p className="lede">
        Short, because there is not much to say. The full version is in the app
        under Profile, then Privacy Policy.
      </p>
      <p className="note">Last updated: {LAST_UPDATED}</p>

      <section className="block">
        <h2>What is stored on our servers</h2>
        <ul className="plain">
          <li>
            Your account: the email address, display name and username on it,
            and the user ID from Sign in with Apple or Google. If you used
            Apple&rsquo;s Hide My Email, what we hold is the private relay
            address, not your real one.
          </li>
          <li>
            The price and grading alerts you set — the card, the target price or
            grading threshold, and the direction — together with the push token
            needed to deliver them while the app is closed.
          </li>
          <li>
            A device push token, if you enabled notifications, stored with the
            device platform and time zone so a notification is not sent in the
            middle of your night.
          </li>
          <li>
            Feedback you send from the app: the category, the message, the app
            version, the account it came from (the user ID, and the username,
            display name or email on it), basic device context, and any image
            you attached. Images go to a private bucket, not a public URL.
          </li>
          <li>Whether a subscription is active. Nothing about how it was paid for.</li>
        </ul>
      </section>

      <section className="block">
        <h2>What stays on your device</h2>
        <p>
          Your watchlist, your search history and your onboarding state are kept
          in the app&rsquo;s own storage on your phone and are not uploaded. A
          consequence worth knowing: they do not follow you to a second device,
          and they go when you delete the app.
        </p>
      </section>

      <section className="block">
        <h2>What is not collected</h2>
        <p>
          No precise location. No contacts, microphone, camera or health data.
          CardPulse does not browse your photo library &mdash; the only image
          that reaches us is one you attach to feedback yourself. No government
          identifiers. CardPulse does not track you across
          other apps or websites, carries no advertising SDK, and does not sell
          personal information. It is not directed to children under 13 and does
          not knowingly collect their information.
        </p>
      </section>

      <section className="block">
        <h2>Who processes it</h2>
        <dl className="facts">
          <div>
            <dt>Apple</dt>
            <dd>
              Sign in with Apple, App Store billing, and push notification
              delivery on iOS.
            </dd>
          </div>
          <div>
            <dt>Google</dt>
            <dd>
              Google Sign-In, Google Play billing, and Firebase Cloud Messaging
              for push notification delivery on Android.
            </dd>
          </div>
          <div>
            <dt>Supabase</dt>
            <dd>
              Authentication and database, US region. Holds the account record
              and the alerts and feedback described above. It does not receive
              your watchlist or search history.
            </dd>
          </div>
          <div>
            <dt>RevenueCat</dt>
            <dd>
              Subscription receipt validation. Receives the CardPulse account ID
              and the App Store or Google Play receipt. No name, no email.
            </dd>
          </div>
          <div>
            <dt>Sentry</dt>
            <dd>
              Crash and performance reporting. Receives error reports and device
              information, and the account email and username when you are
              signed in, so a report can be tied to an account.
            </dd>
          </div>
          <div>
            <dt>Expo</dt>
            <dd>
              The push service that carries a notification from our server to
              Apple or Google. It sees the device token and the message.
            </dd>
          </div>
          <div>
            <dt>Vercel</dt>
            <dd>
              Hosts the functions that fetch prices and run the alert checks.
            </dd>
          </div>
          <div>
            <dt>Price sources</dt>
            <dd>
              TCGplayer market prices; JustTCG for cards TCGplayer does not
              price; live eBay listings, which are asking prices rather than
              sold prices; and mycollectrics.com for the daily price
              leaderboard, the PSA 10 prices and population figures behind the
              grading verdict, and the eBay-derived listing and daily-sales
              aggregates behind market dynamics and recent sales. These are
              read-only: no account data is sent to them.
            </dd>
          </div>
        </dl>
        <p className="note">
          Each provider operates under its own privacy policy. Payment details
          are handled by Apple or Google and never reach our servers.
        </p>
      </section>

      <section className="block">
        <h2>How long it is kept</h2>
        <p>
          Account data is kept for as long as the account exists. Deletion is
          immediate when you ask for it. Copies of deleted records can persist
          in the database provider&rsquo;s encrypted backups until those backups
          rotate out of retention, and crash reports already sent to Sentry are
          held under Sentry&rsquo;s own retention schedule. Daily card closing
          prices are kept
          indefinitely — they describe cards, carry no account identifier, and
          are what makes a price history possible.
        </p>
      </section>

      <section className="block">
        <h2>Deleting it</h2>
        <p>
          Profile, then the ACCOUNT section, then Delete Account, inside the
          app. The account and the alerts and feedback stored against it are
          removed. <Link href="/delete-account">Delete your CardPulse account</Link>{' '}
          sets out the steps, the email route if the app is already uninstalled,
          and exactly what remains.
        </p>
      </section>

      <section className="block">
        <h2>Your rights</h2>
        <p>
          You can ask what is held about you, ask for it to be corrected, ask
          for a copy in a portable format, object to or restrict processing, and
          delete the account outright — the last of which is available in the
          app at any time and needs no request. For anything else, email{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>; requests are answered
          within 30 days. If you are in the EEA or UK, you can also complain to
          your local supervisory authority.
        </p>
      </section>

      <section className="block">
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a> is the only address that
          receives mail for CardPulse. Support, privacy questions and deletion
          requests all go there.
        </p>
      </section>
    </div>
  );
}
