# Data safety answer sheet — CardPulse (Android)

For Play Console > Policy > App content > Data safety. Sections are in the
order the form asks them. Every answer is derived from code read in this
repo; the file:line citation sits next to the answer.

Two definitions this sheet leans on, both **from memory — confirm the
current wording in Play Console before submitting**:

- **Collected** = transmitted off the device.
- **Shared** = transferred to a third party that is *not* a service
  provider processing data on the developer's behalf. Under that reading,
  Supabase, Sentry, RevenueCat, Vercel, Expo push, Google Play billing and
  Google sign-in are all service providers, so **nothing in this app
  is "shared"**. Applied consistently below.

The app's own privacy disclosure lists the same processors:
`app/privacy.tsx:39-40` (section 6, Third-Party Services) — Apple, Google
(including Firebase Cloud Messaging), Expo push, Supabase, Sentry, RevenueCat
and Vercel, plus the read-only price sources (TCGPlayer, JustTCG,
mycollectrics.com, eBay Browse), which receive card queries and no user data.

---

## 1. Data collection and security

| Question | Answer | Basis |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | Sign-in, alert sync, push registration, feedback and crash reporting all transmit data off device — see the per-type tables below. |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Every network call is HTTPS. The API origin the app talks to is `https://strange-saha.vercel.app`, or same-origin HTTPS on web (`src/services/supabase.ts:95-101`; same pattern in `src/services/jp-catalog.ts:10-16`). Push registration: `POST ${origin}/api/push/register` (`src/services/push.ts:86`). Account deletion: `POST ${origin}/api/account/delete` (`src/services/supabase.ts:112`). Supabase JS and the Sentry SDK both use HTTPS transports by default (`src/services/sentry.ts:28-33`). No cleartext endpoint exists in the app. |
| Do you provide a way for users to request that their data be deleted? | **Yes** | In-app: Profile > Delete Account (`app/(tabs)/profile.tsx:136-141,362`) calls `deleteAccount()` (`src/stores/user-store.ts:134`, server call at `:142`) which POSTs to `/api/account/delete`; the endpoint hard-deletes the Supabase auth user with `auth.admin.deleteUser` (`api/account/delete.ts:100`) and purges the user's feedback screenshots (`api/account/delete.ts:84-92`). Server-side alert rows go with it: `alert_targets.user_id` references `auth.users(id) on delete cascade` (`supabase/alerts.sql:25`). On the device the same call clears the profile, the preferences and `recentSearches` (`src/stores/user-store.ts:147-168`) — it does **not** clear the local watchlist or the local alert list, which stay in AsyncStorage until the user deletes or clears the app. The in-app help says so explicitly (`app/help.tsx:52`). Both stores are device-only, so nothing survives on a server; note the distinction if the form or the deletion page describes what deletion removes. Web route: `https://getcardpulse.app/delete-account` (linked from the site footer, `website/app/layout.tsx:104`). |
| Data deletion URL to enter in the form | `https://getcardpulse.app/delete-account` | |
| Independent security review | Leave unchecked — none has been done. |

---

## 2. Data types

Each type below is answered as the form asks: **collected / shared /
ephemeral / required or optional / purposes**.

### 2.1 Personal info > Name

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Required** — it arrives with the sign-in token; the user cannot opt out and still sign in |
| Purposes | Account management; App functionality; Crash reporting and diagnostics |

Basis: Google sign-in requests the `profile` scope and derives a display
name from `gUser.name`, falling back to the email local-part
(`src/services/google-auth.ts:52,127-134`). The name is stored in the
device profile (`src/stores/user-store.ts:9-13`), sent to Sentry as
`username` (`src/stores/user-store.ts:109` → `src/services/sentry.ts:98-100`),
and written to the `feedback.username` column when feedback is sent
(`src/services/feedback.ts:62`). Apple sign-in is **not** a path on Android:
the Apple button renders only when `Platform.OS !== 'android'`
(`src/components/AuthForm.tsx:97-100`), so on this build the name always
comes from Google.

### 2.2 Personal info > Email address

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Required** |
| Purposes | Account management; Crash reporting and diagnostics |

Basis: `scopes: ['email','profile']` on Google sign-in
(`src/services/google-auth.ts:52`, email read at `:127`); the email is held
by Supabase auth as the account identity and is sent to Sentry with each
event (`src/stores/user-store.ts:109` passes `{ email, username }`). Also
used as the feedback fallback identity when no username is set
(`src/services/feedback.ts:62`). Apple's Hide My Email relay never applies
here — the Apple control is hidden on Android
(`src/components/AuthForm.tsx:97-100`).

**Flag:** sending the account email to Sentry is a real disclosure with no
product benefit that the user id would not also give. If the owner would
rather not declare email under Crash reporting, `setSentryUser` at
`src/stores/user-store.ts:109` has to stop passing `email`. Swapping in the
Supabase uuid is not a one-line change: `UserProfile`
(`src/stores/user-store.ts:9-13`) carries only `displayName`, `username`
and `email`, so an id would have to be threaded in from the session first.
Either way it is a code change, not a form answer, and it has to land
before the form is submitted.

### 2.3 Personal info > User IDs

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Required** |
| Purposes | Account management; App functionality; Purchases (subscription entitlement) |

Basis: the Supabase auth uuid is the account id. It is sent to RevenueCat
as the app-user id on every auth state change
(`src/services/revenue-cat.ts:155` `Purchases.logIn(userId)`, wired at
`:195-205`); it is the `user_id` on server-side alert rows
(`supabase/alerts.sql:25`, default `auth.uid()`); it is the `user_id` on
feedback rows and the folder prefix of any uploaded screenshot
(`src/services/feedback.ts:36,61`).

### 2.4 Financial info > Purchase history

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Optional** — only subscribers generate it |
| Purposes | App functionality (unlock Premium); Account management |

Basis: purchases run through RevenueCat over Google Play billing
(`app/paywall.tsx:198-241`, `src/services/revenue-cat.ts:235`
`purchasePackage`, `:249` `restorePurchases`); entitlement state is read
back via `getCustomerInfo` and a customer-info listener
(`src/services/revenue-cat.ts:120,128`). RevenueCat receives the Play
receipt and the account id; per `app/privacy.tsx:40` it never receives name
or email.

**Do not** declare any other Financial info sub-type. The app never sees a
card number, bank detail or credit score — Google Play handles payment
entirely.

### 2.5 App activity > Other user-generated content — alert targets

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Optional** — created only when a user sets an alert |
| Purposes | App functionality (fire the alert while the app is closed) |

Basis: `src/services/alert-sync.ts:54-95` mirrors each active alert into
`public.alert_targets`. Price rows carry `card_id`, `card_name`, `grade`,
`target_price`, `direction` and `push_token`; grading rows carry
`card_number`, `condition`, `direction` and `threshold_net`
(`src/services/alert-sync.ts:71-95`, row shape `supabase/alerts.sql:23-26`).
Rows are RLS-scoped to the owner (`supabase/alerts.sql:77-79`) and cascade
on auth-user delete (`:25`).

**What is NOT sent:** the watchlist itself and search history stay on the
device — `src/stores/watchlist-store.ts:313-325` persists only `items` to
local storage (`partialize`), and `app/privacy.tsx:40` states the same
("Does not receive your watchlist or search history"). So do **not** declare
"App activity > App interactions" or "Search history" for those.

### 2.6 App activity > Other user-generated content — feedback text

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Optional** |
| Purposes | App functionality; Customer support |

Basis: `src/services/feedback.ts:60-68` inserts `kind`, free-text
`message`, `username`, `app_version` and a `context` object into
`public.feedback`. On native the context is only `{ platform }`; the route,
viewport, user agent and locale fields are web-only
(`src/services/feedback.ts:17-29`).

### 2.7 Photos and videos > Photos

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Optional** |
| Purposes | App functionality; Customer support |

Basis: a feedback screenshot is picked from the library with
`ImagePicker.launchImageLibraryAsync` (`app/feedback.tsx:4,68`) and uploaded
to the private `feedback-shots` bucket under the user's id prefix
(`src/services/feedback.ts:13,33-43`). Viewing is admin-only through
short-lived signed URLs (`src/services/feedback.ts:31-32`,
`src/services/admin-feedback.ts`). Screenshots are purged on account
deletion (`api/account/delete.ts:84-92`).

No camera access: `android.permission.CAMERA` is in `blockedPermissions`
(`app.json`, expo.android.blockedPermissions). No video is ever collected.

### 2.8 Device or other IDs

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Optional** — depends on granting notification permission |
| Purposes | App functionality (deliver price, return and news pushes) |

Basis: the Expo push token is fetched with
`Notifications.getExpoPushTokenAsync` and POSTed with the platform and the
device's IANA timezone (`src/services/push.ts:75-94` →
`api/push/register.ts:34-85`, upsert into `public.push_tokens`). The same
token is stored on alert rows so the cron can push while the app is closed
(`src/services/alert-sync.ts:80,92`). Timezone is only kept when the
runtime recognises it (`api/push/register.ts:54-63`) and is used to hold
news pushes outside waking hours (`api/push/register.ts:10-13`; the gate
itself is `isAwake` at `api/cron/news-push.ts:93-104`).

**Judgment call to confirm in Play Console:** the IANA timezone string is
declared here under Device or other IDs, not under Location. It is a
self-reported zone name, not a device location reading, and the app has no
location permission (`app.json`, expo.android.permissions is only
`INTERNET` + `POST_NOTIFICATIONS`). If Play's current guidance treats a
coarse region signal as Approximate location, this answer needs revisiting.

The `push_tokens` row carries no account identifier at all — the upsert
writes only the token, the platform, the time zone and `updated_at`, keyed
on the token (`api/push/register.ts:77-85`), and there is no FK to
`auth.users`. So account deletion does not remove it; it is deleted when
Expo reports the token as no longer valid
(`api/cron/news-push.ts:305`, `api/cron/snapshot-prices.ts:400`). The
deletion page and the in-app policy both say so
(`website/app/delete-account/page.tsx`, "The device push token";
`app/privacy.tsx:44`) — keep the three in step if the schema gains a
`user_id`.

There is **no advertising ID** and no resettable device identifier
collected — see "Not collected" below.

### 2.9 App info and performance > Crash logs

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Required** |
| Purposes | Crash reporting; App functionality (fix defects) |

Basis: Sentry React Native, initialised only when a DSN is configured and
only outside dev (`src/services/sentry.ts:14-17,28-36`). Events carry stack
traces, device and app context, and the signed-in user's email and username
(`src/stores/user-store.ts:109`). IP address is stripped in `beforeSend`
(`src/services/sentry.ts:63-65`). Manual captures come from
`src/components/ErrorBoundary.tsx`, `app/_layout.tsx` and
`src/services/revenue-cat.ts`.

### 2.10 App info and performance > Diagnostics

| Field | Answer |
|---|---|
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No |
| Required or optional | **Required** |
| Purposes | Crash reporting; App functionality (performance) |

Basis: Sentry performance tracing at a 20% production sample rate
(`src/services/sentry.ts:33`) plus the iOS app-hang watchdog
(`:43`). Transaction spans are diagnostics, not analytics — there is no
product-analytics pipeline (below).

### 2.11 Do NOT declare — verified absent

| Data type | Why not |
|---|---|
| Location (approximate or precise) | No location permission requested (`app.json`, expo.android.permissions = `INTERNET`, `POST_NOTIFICATIONS`); no location package in `package.json`. |
| Contacts | No contacts permission, no contacts package. |
| Messages (SMS, email content), Calendar, Call logs, Health and fitness, Audio, Files and docs | No such permission and no such API in the app; `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` are explicitly in `blockedPermissions` (`app.json`). |
| Advertising ID / advertising or marketing purposes | No ads. A grep of `package.json` dependencies for `admob|ads|analytics|facebook|amplitude|mixpanel|firebase|segment|appsflyer|adjust|branch|location` returns nothing. The dependency list is Expo modules, Supabase, Sentry, RevenueCat, Tabler icons, TanStack Query, Zustand and React Native libraries only (39 dependencies, re-checked). The Android build does ship `google-services.json` (`app.json`, expo.android.googleServicesFile) — that is Firebase Cloud Messaging, the transport Expo push uses to deliver the notifications in 2.8, and it is not Firebase Analytics and collects no advertising ID. `app/privacy.tsx:40` already discloses it that way. |
| App activity > App interactions, Search history, Installed apps, In-app search history | No product-analytics SDK exists, and the watchlist and recent searches persist to device storage only (`src/stores/watchlist-store.ts:312-325`, `src/stores/user-store.ts` `recentSearches`). |
| Financial info > payment info, credit score, other financial info | Google Play handles all billing; the app never receives payment instrument data. |
| Personal info > Address, Phone number, Race and ethnicity, Political or religious beliefs, Sexual orientation, Other info | Never requested anywhere in the app. |
| Photos and videos > Videos | Only still images, library-picked, optional. |

---

## 3. Content rating questionnaire — suggested answers

**All of section 3 and section 4 are suggestions to confirm in Play
Console**, since the questionnaire wording is IARC's and changes. The
factual claims behind them are code-backed.

| Question | Suggested answer | Note |
|---|---|---|
| Category | Utility / Productivity / Communication (or Reference) | It is a price-watchlist tool. Not a game. |
| Violence, blood, or gore | No | |
| Sexuality or nudity | No | |
| Profanity or crude humour | No | |
| Controlled substances (drugs, alcohol, tobacco) | No | |
| Gambling, simulated gambling, or contests | **No** | The app shows prices and price history for collectible cards and an expected-net estimate for grading (`src/services/grading-verdict.ts:2-24`). No wagering, no randomised paid outcomes, no loot mechanic, no pack-opening simulation. |
| Real-money gambling or real-money trading | No | The app links out to marketplace listings; it never brokers a transaction. |
| Does the app allow users to interact or exchange content with other users? | **No** | There is no user-to-user surface. The only content a user submits is private feedback to the developer (`src/services/feedback.ts`). Verified: no feed component and no feed route exist in the tree — `FeedPostCard` is named in `.claude/rules/component-patterns.md` but the file is absent, and the deferred `FeedPost` type (`src/types/social.ts`, re-exported at `src/types/index.ts:5`) has no consumer; the only import from `src/types/social.ts` anywhere is the `Notification` type (`app/(tabs)/notifications.tsx:14`, `src/components/NotificationItem.tsx:15`). |
| Does the app share the user's location with other users? | No | No location data at all. |
| Does the app allow users to purchase digital goods? | **Yes** | Subscription via Google Play (`app/paywall.tsx`). |
| Does the app contain user-generated content shown to other users? | No | |
| Financial / investment features | Answer per the questionnaire's own wording, and declare it shows collectible-card prices and price history. The app states prices are not advice (`src/components/AIValuation.tsx:270`, "Not financial advice"). | |

Expected outcome: **Everyone / 3+** on IARC, but the app should be
**targeted at 13 and over** in the next section for the account and
subscription surfaces.

## 4. Target audience and ads — suggested answers

| Question | Suggested answer | Note |
|---|---|---|
| Target age groups | **13-15, 16-17, 18 and over** — i.e. 13+, with no child age band selected | The app requires an account and sells a subscription; it should not be in the Designed for Families programme. |
| Appeals to children | No | |
| Does your app contain ads? | **No** | No ad SDK in `package.json`; the App Store description already states no ads. |
| Ads declaration in the store listing | Leave "Contains ads" unchecked. | |
| Government app | No | |
| Financial features declaration | The app is not a lending, banking, crypto or trading app. If Play's financial-features form is triggered by the Finance category, declare **none of the listed features** and consider listing the app under Shopping instead. Confirm in Play Console. | |
| News app declaration | **No** — the app shows a third-party hobby-news feed (`src/services/news.ts:34-38`) but is not a news publication. Confirm which way Play's News category question cuts. | |

---

## 5. Follow-ups before submitting

1. Decide whether the account email should keep going to Sentry
   (`src/stores/user-store.ts:109`). If it is removed, drop "Email address"
   from the Crash reporting purpose in 2.2.
2. ~~Confirm the deferred social feed is unreachable.~~ Resolved: no feed
   component or route exists in the tree; the `FeedPost` type is unused.
   See section 3 for the grep basis.
3. Confirm `https://getcardpulse.app/delete-account` is live — the footer
   link exists (`website/app/layout.tsx:104`) and the page must resolve
   before the Data safety form will accept the URL.
4. Confirm the "shared" definition and the timezone/location judgment call
   against the live Play Console wording; both are noted from memory here.
