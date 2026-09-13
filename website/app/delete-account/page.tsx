import type { Metadata } from 'next';
import Link from 'next/link';
import { Faq } from '@/components/Faq';

// Written for two readers at once: a person who wants their account gone,
// and a store reviewer checking that the route exists and is honest. Every
// claim below is traceable to the app or the delete endpoint — where the
// code and a nice-sounding sentence disagreed, the code won.
const CONTACT = 'hanwong118@gmail.com';

const FAQ = [
  {
    q: 'How do I delete my CardPulse account?',
    a: 'Open the Profile tab, scroll to the ACCOUNT section, tap Delete Account, and confirm. The account is deleted on the server before the app returns you to the sign-in screen. If the deletion fails, the app says so and leaves the account intact rather than signing you out and pretending.',
  },
  {
    q: 'Can I delete my account without installing the app?',
    a: `Yes. Email ${CONTACT} from the address on the account, or from the address of the Apple or Google account you signed in with, and ask for the account to be deleted. The request is answered within 30 days.`,
  },
  {
    q: 'Does deleting my account cancel my subscription?',
    a: 'No. A CardPulse Premium subscription is billed by Apple or Google, not by CardPulse, and has to be cancelled in the App Store or in Google Play. Deleting the account does not cancel it, and cancelling it does not delete the account.',
  },
];

export const metadata: Metadata = {
  title: 'Delete your CardPulse account',
  description:
    'How to delete a CardPulse account from inside the app or by email, what is deleted, what is kept, and why cancelling a subscription is a separate step.',
  alternates: { canonical: '/delete-account' },
};

export default function Page() {
  return (
    <div className="shell stack">
      <p className="eyebrow">Account</p>
      <h1>Delete your CardPulse account</h1>
      <p className="lede">
        Two routes: one inside the app, one by email if the app is already
        gone. Both end with the account removed, not suspended.
      </p>

      <section className="block">
        <h2>In the app</h2>
        <ol className="plain">
          <li>Open CardPulse and sign in, if you are not already.</li>
          <li>Go to the Profile tab.</li>
          <li>
            Scroll to the <strong>ACCOUNT</strong> section and tap{' '}
            <strong>Delete Account</strong>.
          </li>
          <li>
            Confirm on the prompt that reads &ldquo;This will permanently
            delete your account and all data. This cannot be undone.&rdquo;
          </li>
        </ol>
        <p className="note">
          The app waits for the server to confirm the deletion before it
          returns you to the sign-in screen. If the request fails it shows the
          error and the account stays as it was, so a failed delete is never
          presented as a finished one.
        </p>
      </section>

      <section className="block">
        <h2>Without the app</h2>
        <p>
          Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and ask for the
          account to be deleted. Send it from the address on the account, or
          from the address of the Apple or Google account you used to sign in,
          so the request can be matched to an account. If you signed in with
          Apple and chose Hide My Email, send the message from that private
          relay address or include it in the body.
        </p>
        <p>
          Requests are answered within 30 days, which is the window the{' '}
          <Link href="/privacy">privacy policy</Link> commits to. A request
          that cannot be matched to an account gets a reply saying so rather
          than a silent deletion of the wrong record.
        </p>
        <p className="note">
          {CONTACT} is the only address that receives mail for CardPulse. It
          handles support, privacy requests and deletion requests alike.
        </p>
      </section>

      <section className="block">
        <h2>What is deleted</h2>
        <p>
          Confirming the deletion removes the authentication record for the
          account, and every row keyed to it goes with it:
        </p>
        <ul className="plain">
          <li>
            The account itself — the sign-in record, its email or Apple private
            relay address, and the user ID everything else hangs off.
          </li>
          <li>
            Every price alert and grading alert on the server: card, target
            price or grading threshold, direction, and the push token stored
            with it so alerts could fire while the app was closed. They stop
            firing because the rows no longer exist.
          </li>
          <li>
            Any feedback you sent from the app — the message, the app version
            and the device context attached to it.
          </li>
          <li>
            Any image attached to that feedback. These sit in a private
            storage bucket rather than a database table, so they are cleared
            first, before the account row goes, to avoid leaving them behind.
          </li>
        </ul>
        <p className="note">
          The deletion is immediate and it is not a soft delete or a
          deactivation. There is no restore, no grace period, and no way to
          recover the account or the alerts on it afterwards.
        </p>
      </section>

      <section className="block">
        <h2>What is kept, and for how long</h2>
        <dl className="facts">
          <div>
            <dt>Your watchlist and alert list on the device</dt>
            <dd>
              These live in the app&rsquo;s own storage on your phone, not on a
              server, so a server-side deletion cannot reach them. Deleting the
              account clears the signed-in profile and recent searches on the
              device; the saved cards and the alert list remain in app storage
              until you delete the app, which removes them with it.
            </dd>
          </div>
          <div>
            <dt>Card price history</dt>
            <dd>
              CardPulse keeps a daily closing price per card so returns can be
              measured against something. These rows are about cards, not
              people — they carry no account identifier and nothing links them
              back to you. They are kept indefinitely and are unaffected by
              deletion.
            </dd>
          </div>
          <div>
            <dt>The device push token</dt>
            <dd>
              The token a device registers for notifications is stored on its
              own, with the platform and time zone and no account identifier.
              Deleting the account deletes the alerts that used it, so nothing
              is sent to it; the token row itself is removed when the push
              service reports it as no longer valid — which happens when the
              app is uninstalled or notifications are turned off.
            </dd>
          </div>
          <div>
            <dt>Backups</dt>
            <dd>
              A copy of the account record can persist in the database
              provider&rsquo;s encrypted backups after deletion, until those
              backups rotate out of retention. Crash reports already sent to
              Sentry are held under Sentry&rsquo;s own retention schedule.
            </dd>
          </div>
          <div>
            <dt>Purchase records</dt>
            <dd>
              Apple and Google hold the billing record for a subscription.
              CardPulse never receives payment details, and deleting the
              account does not reach into a store&rsquo;s purchase history.
            </dd>
          </div>
        </dl>
      </section>

      <section className="block">
        <h2>Cancelling a subscription is separate</h2>
        <p>
          CardPulse Premium is billed by the store you bought it from. Deleting
          the account does not cancel the subscription, and cancelling the
          subscription does not delete the account. Do both if you want both.
        </p>
        <ul className="plain">
          {/*
            The iOS path is from Apple's own subscription-management steps,
            not from this codebase, and Apple has renamed that Settings row
            before (Apple ID, then Apple Account). Confirm the current
            wording on a device before a store review cites it.
          */}
          <li>
            iPhone or iPad: Settings, then your name, then Subscriptions, then
            CardPulse.
          </li>
          <li>
            Android:{' '}
            <a
              href="https://play.google.com/store/account/subscriptions?package=com.getcardpulse.app"
              rel="noopener"
            >
              Google Play subscriptions
            </a>
            , then CardPulse. The same page opens from the paywall screen in
            the app.
          </li>
        </ul>
        <p className="note">
          Cancelling stops the next renewal. It does not refund the current
          period — refunds are handled by Apple or Google, not by CardPulse.
        </p>
      </section>

      <Faq items={FAQ} />

      <section className="block">
        <h2>Related</h2>
        <ul className="plain">
          <li>
            <Link href="/privacy">Privacy</Link> — what is collected, who
            processes it, and how long it is kept.
          </li>
          <li>
            <Link href="/support">Support</Link> — reporting a bug or a price
            that looks wrong.
          </li>
        </ul>
      </section>
    </div>
  );
}
