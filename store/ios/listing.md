# App Store listing — CardPulse (iOS)

Metadata to apply in App Store Connect with the next version. "Live" values
were read from the App Store on 2026-09-20. Every count below was measured by
script (see "Counts"), not estimated.

Entity term: **watchlist**. The app name and the description's opening line
("CardPulse is a watchlist for trading cards") already use it; the promotional
text now leads with it too. "Watchlist" is not a search term (zero "watchlist"
or "watch list" queries in `.claude/keyword-corpus.txt`, 10,081 phrases), so the
search-facing fields (subtitle, keywords) carry the tracker / price / worth
wording people type.

## Which fields need a new version

| Field | Limit | Editable |
|---|---|---|
| Name | 30 | Version-locked (ships with a new version) |
| Subtitle | 30 | Version-locked |
| Keywords | 100 | Version-locked |
| Description | 4000 | Version-locked |
| Promotional text | 170 | Anytime, no new version or review needed |

Apple indexes name + subtitle + keywords as one pool. A word in one of them is
wasted if repeated in another.

---

## Name — unchanged

```
CardPulse: TCG Card Watchlist
```

29 / 30. Why: already carries the entity term; no change.

## Subtitle — change

Live:

```
Prices, alerts and returns
```

26 / 30.

Next version:

```
Price tracker, alerts, returns
```

30 / 30. Why: "price tracker" is the phrase people type ("tracker" 44 corpus
occurrences, "price" 1,512), and no word repeats the name. Revised from the
first draft `Card price tracker & alerts`, whose "Card" duplicated the name and
added no index coverage. "returns" moves here from the keywords field.

## Keywords — change

Live:

```
pokemon,psa,graded,slab,sealed,portfolio,returns,market,ebay,prices,comp,invest,pop,value,collection
```

100 / 100.

Next version:

```
pokemon,psa,graded,sealed,portfolio,market,ebay,invest,pop,value,collection,worth,japanese,chase,box
```

100 / 100. Comma-separated, no spaces, no duplicates, no word from the name
(`cardpulse`, `tcg`, `card`, `watchlist`) or the new subtitle (`price`, `tracker`, `alerts`, `returns`).

Why, per change (corpus counts are whole-word, case-insensitive, over
`.claude/keyword-corpus.txt`):

| Change | Why |
|---|---|
| drop `prices` | "price" is now in the subtitle, so `prices` is likely redundant (Apple's singular/plural matching is not verified here) |
| drop `comp` | 0 corpus occurrences |
| drop `slab` | 1 corpus occurrence |
| add `worth` | 1,089 occurrences, the largest intent not already claimed |
| add `japanese` | 320 occurrences; Japanese cards are searchable in the app (`app/(tabs)/search.tsx:151-191`, `src/services/jp-catalog.ts:1-8`) |
| drop `returns` | now in the subtitle |
| add `chase` | 312 occurrences ("151 chase cards", "chase cards list") |
| add `box` | 388 occurrences ("booster box", "elite trainer box"); sealed products are in the app |

Kept terms with low corpus counts, for the owner to reconsider: `portfolio`
(5), `pop` (7). Both are candidates for the next swap.

Owner decision: `collection` and `portfolio` sit against the site's
positioning that CardPulse is not a collection tracker
(`website/app/watchlist/page.tsx`, `website/public/llms.txt`). Drop them, or
keep the tension on purpose. 0 characters remain.

## Promotional text — change (no new version needed)

```
CardPulse is a watchlist for trading cards: live market prices, a push when a card hits your target price, and with Premium, the return on each card since you added it.
```

168 / 170. Why: leads with the watchlist noun and states the three shipped
features: live market prices, target-price alerts, returns since added.
"With Premium" is there because returns since added is premium-only
(`app/paywall.tsx:86-90`); alerts are free up to 3 active
(`src/stores/alerts-store.ts:29`).

## Description — no change in this pass

Version-locked. The live description already opens "CardPulse is a watchlist
for trading cards". Its full text is not recorded in this repo; keep it
consistent with `store/android/listing.md` (free tier 5 watchlist items shared
by cards and sealed, 3 active alerts; prices from TCGplayer Market Price with
JustTCG fallback, graded data from mycollectrics.com, live eBay listings) and
add no AI / fair-value claim.

---

## Counts

```sh
node -e '
for (const s of [
  "CardPulse: TCG Card Watchlist",
  "Prices, alerts and returns",
  "Price tracker, alerts, returns",
  "pokemon,psa,graded,slab,sealed,portfolio,returns,market,ebay,prices,comp,invest,pop,value,collection",
  "pokemon,psa,graded,sealed,portfolio,market,ebay,invest,pop,value,collection,worth,japanese,chase,box",
  "CardPulse is a watchlist for trading cards: live market prices, a push when a card hits your target price, and with Premium, the return on each card since you added it.",
]) console.log(s.length, s)'
```

| Field | Limit | Live | Next |
|---|---|---|---|
| Name | 30 | 29 | 29 |
| Subtitle | 30 | 26 | 30 |
| Keywords | 100 | 100 | 100 |
| Promotional text | 170 | — | 168 |

Corpus counts:

```sh
for w in pokemon psa graded slab sealed portfolio returns market ebay prices comp invest pop value collection worth japanese chase box; do
  printf "%s %s\n" $w $(rg -c -i -w "$w" .claude/keyword-corpus.txt || echo 0)
done
```

## Provenance

| Claim | Source |
|---|---|
| Free watchlist cap 5, shared by cards and sealed; premium bypass | `src/stores/watchlist-store.ts:159`, `:294-309` (premium at `:301`) |
| Free tier 3 active alerts; premium uncapped | `src/stores/alerts-store.ts:29`, `:262`, `:304` |
| Premium: unlimited watchlist, unlimited alerts, returns since added | `app/paywall.tsx:71-91` |
| Price sources | `website/app/methodology/page.tsx`; `store/android/listing.md` Provenance |
