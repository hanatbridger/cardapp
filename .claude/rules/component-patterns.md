# Component Patterns — CardPulse

**Source:** `src/components/` (24 components, all exported via `src/components/index.ts`)
**Styling:** inline `style={{...}}` only — no className, no NativeWind, no styled-components.
**Theme:** `const { colors, typography, spacing, radius, shadows, glass } = useTheme()` at the top of every component.

## Core rule

**Always reuse existing primitives.** Before writing a new View+styling block, check if a primitive (Card, Button, Text, Badge, Input, EmptyState, Skeleton) already does it.

## Primitive inventory

### `<Text variant="..." color={...}>`
The only way to render text. Default color is `colors.onSurface`.
Variants: `displayLg/Md/Sm`, `headingLg/Md/Sm`, `bodyLg/Md/Sm`, `labelLg/Md/Sm`, `caption`, `overline`.

### `<Button variant="..." size="..." icon={Icon} onPress fullWidth loading disabled>`
- Variants: `filled` (primary CTA), `tonal` (secondary), `outlined` (tertiary), `ghost` (low-emphasis), `danger` (destructive only)
- Sizes: `sm` (32px), `md` (40px, default), `lg` (48px)
- Icon goes left. For destructive actions always confirm via Modal.

### `<Card elevated glass padding={spacing[6]}>`
- Default `radius.xl`, `surface` background, `outline` border
- `elevated` adds `shadows.md`
- `glass` swaps to translucent glass background

### `<Input label error hint icon required ref>`
- `forwardRef` — works with React Hook Form
- Vertical stack: label / field / hint or error

### `<Badge variant="..." dot>` — pulse chip
Renders the brand book chip recipe: `{ramp-400}` at 18% alpha fill, `{ramp-200}` text, 12px radius, SG 500 12/-0.1. Every chip carries categorical meaning — do not invent free-form labels.

- **Tier 1 — price movement:** `gain`, `loss` (use `▲`/`▼` prefix in children)
- **Tier 2 — valuation verdict:** `undervalued`, `overvalued`
- **Tier 3 — grading status:** `graded`, `ungraded`
- **Tier 4 — signals / scarcity:** `live` (auto dot), `trophy` (used sparingly)
- **Legacy aliases** (back-compat, prefer tier variants): `success`, `warning`, `danger`, `info`, `neutral`

### `<SegmentedControl options={[]} value onChange>`
Glass background, active item gets `surface` + `shadows.sm`.

### `<BrandMark size={24} variant="color" | "mono" color>`
The CardPulse prism. Use only in brand moments (auth screens, home header, splash). Never rotate, stretch, gradient, glow, or place indigo-on-indigo — see brand book page 03.

### `<Avatar uri name size={40}>`
Falls back to initials in `primaryContainer`.

### `<EmptyState icon title description actionLabel onAction>`
Use for empty lists (Watchlist, Search, Alerts).

### `<Skeleton width height radius variant>` / `<SkeletonText lines>` / `<CardDetailSkeleton>`
Animated opacity pulse. Use during data fetches.

### `<SearchBar value onChange placeholder>`
Glass background, leading `IconSearch`.

### `<ScreenBackground>`
Animated gradient. Wrap screen root. Pause animation on blur (TODO in checklist).

### `<PriceChange value size>`
Sizes: `sm`, `md`, `lg`. Auto color from `success`/`danger`. Trending icon prefix.

### `<GradeBadge grade>`
Reads from `src/constants/grades.ts`. **Note:** GRADES currently has hardcoded amber/gray — to be tokenized.

### `FloatingTabBar` (in `app/(tabs)/_layout.tsx`)
Liquid-glass floating tab bar (Apple-style frosted capsule). Not exported from barrel; defined inline in the tab layout. `TabBarPreview` in `app/design-system.tsx` mirrors it — keep in sync when this changes.

**Anatomy:** `[● Home]  [Search · News · Bell · Profile]` — a standalone frosted circle for Home plus a frosted capsule for the rest, both floating near the bottom (never docked — content scrolls underneath; the live backdrop is what the blur frosts), sharing one glass recipe and `gap: spacing[2]`. Icon-only, labels kept as a11y names. A single raised glass pill SLIDES between the capsule's tabs (one element translating — never per-tab backgrounds); the Home circle has its own inner pill that opacity-crossfades in when Home is active (a pill can't slide across separate surfaces).

- **Geometry:** both surfaces 62pt tall (26 icon + 14×2 item pad + 4×2 track pad); capsule `radius 100`, Home a circle; inner padding 4; capsule tab items `flex: 1`, vertical padding 14; icons 26pt, strokeWidth 2 (both states). Pills inset 4; sliding pill width = (trackWidth − 8) / 4.
- **Container:** `absolute`, left/right 0, bottom 0, `paddingHorizontal spacing[4]`, `paddingBottom = safeArea + 10`, `pointerEvents: 'box-none'` (in style, for Fabric).
- **Shadow:** on a WRAPPER around the capsule (the capsule is `overflow: hidden` and would clip its own shadow). y10 / blur 20 / #000 @40% (Android `elevation 16`).
- **Frost — native:** `BlurView` intensity 32, theme tint, absolute-fill as first child, under a translucent tint fill.
- **Frost — web:** injected CSS. Baseline `backdrop-filter: blur(24px)`; Chromium gets SVG `feDisplacementMap` refraction filters (`#lg` track / `#lg-sm` pill) + inset specular shadows, gated on `CSS.supports('backdrop-filter','url(#x)')`. Applied via `dataSet={{ glass }}` → `[data-glass]` selectors.
- **Tints (spec values, deliberately not tokens):** dark — track `rgba(0,0,0,0.10)`, pill `rgba(255,255,255,0.10)`; light — track `rgba(0,0,0,0.05)`, pill `#ffffff`. Icon color `colors.onSurface`; inactive opacity 0.2, active 1.0.
- **Motion:** pill slides with spring (tension 58, friction 12); snaps (no animation) on first layout. Press pop: pill scales to 1.10 while held, springs back. Icon opacity crossfade 240ms.
- **Unread badge:** 12pt dot (#ff3b30, 1.5pt ring in the track tint) on the Bell glyph when un-read triggered alerts exist; sits OUTSIDE the opacity fade so it stays bright on idle tabs.
- **Scroll clearance:** screens reserve `TAB_BAR_HEIGHT` (96) of bottom padding so content scrolls under the bar but nothing hides behind it.
- All tabs trigger `Haptics.selectionAsync()` on press; the Explore focused-search overlay still hides the bar via `tabBarStyle.display: 'none'`.

## Domain components

| Component | Purpose |
|---|---|
| `PriceChart` | SVG line chart with crosshair |
| `CardSearchResult` | Pressable row in search results |
| `WatchlistCard` | Card row with valuation chip |
| `TrendingCarousel` | Auto-scrolling FlatList |
| `AIPicks` | Pick cards in surfaceVariant container |
| `AIValuation` | AI prediction banner (slim — only renders when valuation exists) |
| `CardFundamentals` | StockTwits-style fundamentals table |
| `NotificationItem` | Notification row with typed icon |
| `FeedPostCard` | Feed post (deferred to v2) |
| `PriceAlertModal` | Set/edit price alerts |
| `WatchlistFullModal` | Full watchlist sheet |
| `AuthForm` | Sign in / sign up (Apple HIG colors) |
| `ErrorBoundary` / `withErrorBoundary` | Class boundary, HOC for screens |

## Composition patterns

### Screen scaffold
```tsx
<ScreenBackground>
  <SafeAreaView style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[6] }}>
      {/* sections */}
    </ScrollView>
  </SafeAreaView>
</ScreenBackground>
```

### Section
```tsx
<View style={{ gap: spacing[3] }}>
  <Text variant="overline" color={colors.onSurfaceVariant}>SECTION</Text>
  <Card>{/* content */}</Card>
</View>
```

### Row (label / value)
```tsx
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[3] }}>
  <Text variant="bodyMd" color={colors.onSurfaceVariant}>Label</Text>
  <Text variant="bodyMd">Value</Text>
</View>
```

### Divider
```tsx
<View style={{ height: 1, backgroundColor: colors.outline }} />
```

## Touch targets

Minimum 44×44 (Apple HIG). Wrap small icons in `Pressable` with `hitSlop` or padding.

## Accessibility

- `accessibilityLabel` on every interactive control
- `accessibilityRole="button"` for `Pressable` CTAs
- Decorative icons get `accessibilityElementsHidden`
- Color-coded info also conveyed via icon or text

## Anti-patterns — never do these

1. ❌ Hardcoded hex/rgba in component styles
2. ❌ `colors.x + '15'` hex alpha concatenation — use `withAlpha`
3. ❌ Raw `<RNText>` with inline `fontSize`
4. ❌ Numeric spacing literals (`padding: 16` → `padding: spacing[4]`)
5. ❌ Importing from individual files instead of `src/components` barrel
6. ❌ Adding NativeWind `className` props (Tailwind is dead code)
7. ❌ Using Lucide icons or fabricating Tabler icon names
8. ❌ Skipping `useTheme()` and reading colors from a stale prop
