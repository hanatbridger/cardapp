# Google Play store listing — CardPulse

Draft copy for Play Console > Grow > Store presence > Main store listing.
Every feature claim below is traceable to code; citations are in the
"Provenance" section at the bottom. Character counts were produced by
`node -e` over the exact strings in this file (see "Counts").

---

## App name

```
CardPulse: TCG Card Watchlist
```

29 / 30 characters. Confirmed by count.

## Short description

```
A watchlist for Pokemon cards: live prices and a push when one hits your price.
```

79 / 80 characters. Leads with the watchlist noun (the entity term the app
name and full description use); keeps "Pokemon" and "prices" as the
searchable terms. The corpus has no "watchlist" queries, so the noun is here
for consistency, not for search.

## Full description

```
CardPulse is a watchlist for trading cards. Add what you are watching to one list; each raw card on it shows a live market price.

THE WATCHLIST

- Add raw cards from search, plus a curated set of sealed products.
- Prices update on their own, so the list is current when you open it.
- The free tier holds five items; cards and sealed products share those five slots. Premium removes the cap.
- Two cards are already on the list on first open. They count toward the five.

PRICE ALERTS

- Set a target price on a raw card. CardPulse sends a push notification when the price crosses it.
- The free tier holds three active alerts. Premium removes the cap.
- Checked while the app is open, in the background when the system allows, and on our servers when closed.
- Alerts run on raw, ungraded prices.
- A notification feed keeps every alert that has fired, so you can see what tripped and when.

RETURNS SINCE ADDED (PREMIUM)

- CardPulse records the price the moment you add a card, and shows what it has made or lost since.
- Two figures per card: today's move against yesterday's close, and the total return against the price when you added it.
- A push when a card is up or down 20% against that starting price.
- The starting price is one we observed, never an estimate.

MARKET DYNAMICS

- Active listings, new listings a day and sales a day for a card, each against its own 30-day baseline.
- Demand pressure and supply saturation, on a scale from heavy supply to very tight.
- From eBay listing data. Directionally accurate, not exact.

AROUND THE WATCHLIST

- Daily movers. The Trending list rebuilds each morning from a daily card leaderboard, ranked on day-over-day price movement.
- Price history. A daily series with a draggable crosshair and selectable time ranges.
- A fundamentals table on every card page.
- A grading verdict: the expected net result of a PSA submission, from the live PSA 10 sold price, the PSA population census, and a fee of about $92 all-in. PSA 9 and below are modelled, and labelled as estimates.
- Recent sales. Daily sold counts and average prices from ended eBay listings.
- Search the catalogue by card, set or artist. Sealed products appear alongside cards.
- Set and artist pages, for working through a full set or one illustrator's run.
- Trading card news from hobby outlets, with a push when a story lands. A few a day at most, quiet overnight in your timezone.
- Every price converts to the currency you pick, at a daily rate.
- Dark and light mode. No ads anywhere in the app.

CARDPULSE PREMIUM

$4.99 per month or $29.99 per year.

- Unlimited watchlist
- Unlimited price alerts
- Returns since added, with a push at plus or minus 20%

The catalogue, price history, daily movers, market dynamics, recent sales, the grading verdict and the news feed are the same on both tiers.

Subscriptions are billed through Google Play. Payment is charged to your Google Play account when you confirm the purchase, and renews automatically at the same price unless cancelled at least 24 hours before the end of the current period. Cancel or manage it in Google Play, under Subscriptions. Cancelling stops the next renewal; access continues to the end of the paid period.

ACCOUNT

Sign in with Google. Account deletion is available inside the app, under Profile, and on the web at https://getcardpulse.app/delete-account.

PRICES AND SOURCES

Raw card prices come from TCGplayer Market Price, with JustTCG covering cards TCGplayer does not price. Graded (PSA 10) prices, PSA population and sales aggregates come from a public card price site built on eBay data. Live eBay listings show asking prices. Prices are indicative, not an offer to buy or sell, and nothing in the app is financial advice.

CardPulse is an independent collector tool. It is not affiliated with, endorsed by, or sponsored by Nintendo, The Pokemon Company, Creatures Inc., or GAME FREAK inc. All card names, images, and trademarks remain the property of their respective owners.
```

3,989 / 4000 characters.

---

## Counts

Measured, not estimated. Every fenced block above was extracted and its
length taken with Node:

```sh
node -e 'const src = require("fs").readFileSync("store/android/listing.md", "utf8");
[...src.matchAll(/```\n([\s\S]*?)\n```/g)].forEach((m, i) => console.log(i, m[1].length));'
```

Output on 2026-09-20: `0 29`, `1 79`, `2 3989`.

| Field | Limit | Count | Margin |
|---|---|---|---|
| App name | 30 | 29 | 1 |
| Short description | 80 | 79 | 1 |
| Full description | 4000 | 3989 | 11 |

Newlines count as one character each, which is how Play Console counts
them. The full description has only 11 characters of headroom — any added
bullet needs a matching cut.

---

## Store listing metadata

| Field | Value |
|---|---|
| Package name | `com.getcardpulse.app` |
| Category | Suggested: **Finance**. Alternative: **Shopping**. The website's structured data already declares `applicationCategory: FinanceApplication`. Confirm the available category list in Play Console. |
| Tags (Play allows up to 5) | Suggested: *Collectibles*, *Price tracking*, *Trading cards*, *Investing*, *Alerts*. Play's tag vocabulary is a fixed list chosen in Console — these are intents, not verbatim tags. Confirm in Play Console. |
| Contact email | hanwong118@gmail.com |
| Website | https://getcardpulse.app |
| Privacy policy URL | https://getcardpulse.app/privacy |
| Account deletion URL | https://getcardpulse.app/delete-account |
| Contact phone | Leave blank (optional). |
| External marketing | Off, unless the owner wants Play to advertise the app. |

---

## Copy decisions and omissions (read before shipping)

1. **The premium feature list here is shorter than the one the app shows.**
   `app/paywall.tsx:70-91` gates four things behind `isPremium`: unlimited
   watchlist, unlimited price alerts, the AI/fair-value prediction feature, and
   returns since added. Per the owner's decision, no AI or fair-value claim
   appears in new public copy, so the prediction feature is omitted from this
   listing. The listing therefore under-claims rather than over-claims, which is
   the safe direction for Play policy — but it means a paying user gets a gated
   feature the listing never mentioned. Resolve when the in-app wording is
   reworked in the separate release.
2. **No Apple references in the body.** The Account section says Google only.
   `expo-apple-authentication` ships in `package.json`, but the Apple button is
   rendered only when `Platform.OS !== 'android'`
   (`src/components/AuthForm.tsx:97-100`, with the comment that
   `signInAsync` throws `ERR_UNAVAILABLE` on Android), and `app/(auth)/login.tsx`
   passes it through `AuthForm` unchanged (`:125`). Sign in with Apple is
   therefore not reachable in the Android build, so claiming it would be
   inaccurate metadata.
3. **Graded (PSA 10) price tracking is partially gated in the app**
   (`app/card/[id].tsx:632-649`, `app/help.tsx:20`) — full PSA 10 tracking is
   described in-app as coming later. The listing does not claim PSA 10 price
   tracking as a watchlist feature; it only claims the grading verdict and eBay
   sold data, which do ship.
4. **"$92 all-in" grading fee** is a hand-maintained constant
   (`src/services/grading-verdict.ts:98`). If that constant changes, this line
   changes.
5. Prices ($4.99 / $29.99) are the literals in `app/paywall.tsx:46-61`, used as
   fallbacks; the real charge is whatever the Play product says. Play localises
   displayed prices, so consider dropping the explicit figures from the listing
   if the owner sells outside the US.

---

## Provenance (file:line for every claim)

| Claim | Source |
|---|---|
| Package `com.getcardpulse.app`, app name "CardPulse", version 1.0.20 | `app.json` (expo.android.package, expo.name, expo.version) |
| Free watchlist cap is 5 items, shared by cards and sealed | `src/stores/watchlist-store.ts:159` (`maxFreeItems: 5`), `:293-310` (`canAddMore`, premium bypass at `:301`) |
| Two cards preloaded on first open, counting toward the cap | `src/stores/watchlist-store.ts:78-99` (`DEFAULT_WATCHLIST`: Charizard ex 151 #199, Umbreon ex Prismatic Evolutions #161), used as initial `items` at `:158` |
| Free tier holds 3 active alerts; triggered alerts free a slot; premium uncapped | `src/stores/alerts-store.ts:26-29` (`MAX_FREE_ALERTS = 3` + comment), `:259-263`, `:302-304` |
| Alerts cover price targets and grading-ROI targets | `src/stores/alerts-store.ts` (`PriceAlert` at `:31`, grading alert types), `src/services/alert-sync.ts:22-39` |
| Server-side alert checking while the app is closed | `src/services/alert-sync.ts:8-20` (mirrors alerts into `public.alert_targets` for the daily snapshot cron) |
| Foreground and background alert checks | `src/hooks/use-alert-checker.ts:76`, `src/services/background-alerts.ts:64` |
| Returns since added is premium; ±20% push | `app/paywall.tsx:86-90`, `src/components/ReturnsSinceAdded.tsx:70,162,237` (non-premium branch), `src/stores/watchlist-store.ts:145-150` (`markReturnAlerted`) |
| Baseline is an observed live price, never an estimate | `src/stores/watchlist-store.ts:134-140` (`stampBaselines` — "Pass LIVE prices only") |
| Raw prices are TCGplayer Market Price, with JustTCG as the fallback for cards TCGplayer does not price | `app/help.tsx:16`, `app/card/[id].tsx:704` (source label enumerates `tcgplayer` / `justtcg` / `ebay` / `pricecharting`), `src/services/tcgplayer.ts`; fallback written at `api/tcgplayer/price.ts:99` (`source: 'justtcg'`) and re-priced daily by `api/cron/justtcg-refresh.ts:1-9` |
| Graded (PSA 10) prices, PSA population and sales aggregates come from mycollectrics.com, built on eBay data; direct eBay calls return live listings, which are asking prices | `api/_lib/collectrics.ts:1-10` (PSA 10 price series + population, daily sold aggregates), `api/card-stats.ts:3-5`, `src/services/grading-verdict.ts:11-13`; `api/ebay-listings.ts:1-2,16-19` — the Browse keyset has no Marketplace Insights scope, so it returns ACTIVE listings only |
| eBay market dynamics: active listings, new/day, sold/day, demand pressure, supply saturation; directional not exact | `src/components/MarketDynamics.tsx:224,287`, `website/app/page.tsx` (dyn-card section) |
| Recent sales from ended eBay listings | `app/card/[id].tsx:1114,1147`, `src/services/ebay-listings.ts` |
| Grading verdict: EV over the PSA grade distribution, from live PSA 10 sold price + PSA population census; PSA 9 and below modelled and labelled as estimates | `src/services/grading-verdict.ts:2-24` |
| Grading fee ~$92 all-in, PSA Regular | `src/services/grading-verdict.ts:98-99` |
| Trending rebuilds daily from a card leaderboard on day-over-day movement | `src/services/trending.ts`, `src/services/market-index.ts`; price source note `app/(tabs)/index.tsx:183` |
| Price history chart with draggable crosshair and time ranges | `src/components/PriceChart.tsx` |
| Search by card / set / artist, sealed alongside cards | `app/(tabs)/search.tsx:151-191` (card, sealed and Japanese queries merged into one result list), `src/services/pokemon-tcg.ts`, `src/services/sealed-live.ts:3-8` (live `/api/sealed-search`, curated catalogue only as fallback). `src/services/jp-catalog.ts:1-8` is the Japanese-card source, not sealed |
| News feed with push, quiet overnight in the device timezone | `src/services/news.ts:34-38` (`fetchNews` over `/api/news`), `api/push/register.ts:10-13` (timezone stored for this purpose), quiet-hours gate at `api/cron/news-push.ts:76,93-104` (`isAwake`) |
| Currency conversion at a daily rate | `src/services/fx.ts`, `src/constants/currencies.ts` |
| No ads | `package.json` dependencies contain no ad or analytics SDK (see data-safety.md) |
| Subscription is billed through Google Play; manage under Play > Subscriptions | `app/paywall.tsx:108-124` (`PLAY_SUBSCRIPTIONS_URL`, `openPlaySubscriptions`), `:495-513` ("Subscriptions auto-renew until cancelled", Android branch) |
| $4.99/month, $29.99/year | `app/paywall.tsx:46-61` (literals; store prices override at runtime, `:463-472`) |
| Sign in with Google (Apple hidden on Android) | `src/services/google-auth.ts:52` (`scopes: ['email','profile']`); Apple button gated to non-Android at `src/components/AuthForm.tsx:97-100`, wired at `app/(auth)/login.tsx:125` |
| In-app account deletion under Profile | `app/(tabs)/profile.tsx:136-141,362`, `src/stores/user-store.ts:141`, `src/services/supabase.ts:104-126` (`POST /api/account/delete`), `app/help.tsx:52` |
| Not affiliated with Nintendo / The Pokemon Company / Creatures / GAME FREAK | Existing public wording: `website/app/layout.tsx:106-110` |
