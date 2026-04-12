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

### `<Badge variant="..." dot>`
- Variants: `success`, `warning`, `danger`, `info`, `neutral`
- Status dot on by default

### `<SegmentedControl options={[]} value onChange>`
Glass background, active item gets `surface` + `shadows.sm`.

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
