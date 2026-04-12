---
name: design-system
description: >
  CardPulse design system. Use this skill whenever building, modifying, or reviewing ANY UI in the
  CardPulse Pokemon card tracker app. Triggers: creating React Native screens or components, styling
  anything, choosing colors/typography/spacing, picking icons, building cards/forms/modals/lists,
  implementing Figma designs, or anything visual. Also trigger on mentions of "tokens", "theme",
  "design system", "BDS", or "on-brand". Even simple requests like "build a settings screen" or
  "add a button" must use this skill.
---

# CardPulse Design System

CardPulse is a Pokemon card price tracker (Expo SDK 54, React Native, Expo Router, Zustand, React Query) launching to the App Store. The visual system is a customized fork of the **Bridger Design System (BDS)** — three-layer token architecture, semantic naming, light/dark modes, glassmorphic surfaces over an animated gradient background.

**Source of truth:** `src/theme/tokens.ts` and `src/constants/layout.ts`. If you ever doubt a value, read those files — never guess.

---

## Token access

Always read tokens from `useTheme()`. Never import `tokens.ts` directly inside a component.

```tsx
import { useTheme } from '../theme/ThemeProvider';

export function MyComponent() {
  const { colors, typography, spacing, radius, shadows, glass } = useTheme();
  return (
    <View style={{ padding: spacing[4], backgroundColor: colors.surface, borderRadius: radius.xl }}>
      <Text variant="headingMd">Hello</Text>
    </View>
  );
}
```

The provider is `src/theme/ThemeProvider.tsx`. It picks light/dark via `useColorScheme()`. You can also override manually via context.

---

## Styling approach

**Inline `style={{...}}` is the only pattern.** No `className`, no NativeWind, no styled-components. The Tailwind config exists but is dead code — do not add `className` props.

```tsx
// ✅ Correct
<View style={{ padding: spacing[4], gap: spacing[3] }} />

// ❌ Wrong
<View className="p-4 gap-3" />
<View style={{ padding: 16 }} />  // raw numbers
```

---

## Colors — semantic tokens only

| Token | Use |
|---|---|
| `primary` / `onPrimary` / `primaryContainer` / `onPrimaryContainer` | Primary actions, links, focus |
| `secondary` | Secondary actions |
| `surface` / `onSurface` | Default backgrounds and text |
| `surfaceVariant` / `onSurfaceVariant` | Subtle surfaces, secondary text |
| `outline` / `outlineVariant` | Borders, dividers |
| `success` / `successContainer` | Gains, positive states |
| `warning` / `warningContainer` | Caution |
| `danger` / `dangerContainer` | Losses, destructive, errors |
| `info` | Informational |
| `skeleton` | Loading placeholders |

**Light primary:** `#4B5EFC` indigo. **Dark primary:** `#6B7CFF`. Don't reference these hex values directly.

### Alpha / opacity

Use `withAlpha` from `src/utils/withAlpha.ts`. **Never** concatenate hex strings:

```tsx
// ✅
backgroundColor: withAlpha(colors.primary, 0.15)

// ❌
backgroundColor: colors.primary + '15'
```

---

## Typography — `<Text variant="...">`

Never render `<RNText>` directly with inline `fontSize`. Always use `<Text>` from `src/components/Text.tsx`.

```tsx
import { Text } from '../components/Text';

<Text variant="headingLg">Section title</Text>
<Text variant="bodyMd" color={colors.onSurfaceVariant}>Muted body</Text>
```

Variants: `displayLg/Md/Sm`, `headingLg/Md/Sm`, `bodyLg/Md/Sm`, `labelLg/Md/Sm`, `caption`, `overline`.
Default body is `bodyMd` (16px). Default color is `colors.onSurface`.

---

## Spacing — 4px grid

Use `spacing[N]` where N is the key. Common defaults:

- `spacing[4]` (16) — screen horizontal padding, default stack gap
- `spacing[3]` (12) — tight component padding
- `spacing[6]` (24) — card padding, section gap
- `spacing[8]` (32) — section separation

Full scale: `0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32` → 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128 px.

---

## Radius

`none` 0, `sm` 6, `md` 12, `lg` 16, `xl` 20, `2xl` 24, `3xl` 32, `full` 9999.

- Inputs/chips: `radius.sm`
- Buttons/badges: `radius.md`
- **Cards (default): `radius.xl`**
- Modals: `radius.2xl`
- Pills/avatars: `radius.full`

---

## Component library

All exported via `src/components/index.ts`. **Always reuse before building new.**

**Primitives:** `Text`, `Button`, `Card`, `Input`, `Badge`, `GradeBadge`, `PriceChange`, `Avatar`, `SegmentedControl`, `SearchBar`, `EmptyState`, `Skeleton` / `SkeletonText` / `CardDetailSkeleton`, `ScreenBackground`

**Domain:** `PriceChart`, `CardSearchResult`, `WatchlistCard`, `TrendingCarousel`, `AIPicks`, `AIValuation`, `CardFundamentals`, `NotificationItem`, `PriceAlertModal`, `WatchlistFullModal`, `AuthForm`, `ErrorBoundary` / `withErrorBoundary`

### Quick reference

```tsx
<Button variant="filled" size="md" icon={IconPlus} onPress={...}>Create</Button>
<Card>...</Card>
<Card elevated>...</Card>
<Card glass>...</Card>
<Input label="Email" placeholder="..." error={errors.email} icon={IconMail} />
<Badge variant="success">Active</Badge>
<EmptyState icon={IconSearch} title="No results" description="Try a different query." />
<Skeleton width="100%" height={120} radius={radius.xl} />
```

---

## Icons — Tabler only

`@tabler/icons-react-native`. **Critical rules:**

1. **Never fabricate icon names.** Verify at https://tabler.io/icons.
2. **Always use the `Icon` prefix.** `<Search />` is wrong; `<IconSearch />` is correct. Filled variants append `Filled`.
3. Pass color via `color={colors.onSurface}`.

Sizes: 16 dense, 20 default, 24 touch, 32+ decorative.

Safe icons (verified): IconSearch, IconPlus, IconX, IconCheck, IconChevronRight, IconChevronDown, IconChevronLeft, IconArrowRight, IconArrowLeft, IconSettings, IconUser, IconUsers, IconUserPlus, IconBell, IconBellFilled, IconBellRinging, IconMail, IconHome, IconEdit, IconTrash, IconEye, IconEyeOff, IconDownload, IconUpload, IconShare, IconFilter, IconStar, IconStarFilled, IconHeart, IconHeartFilled, IconBookmark, IconBookmarkFilled, IconCopy, IconExternalLink, IconInfoCircle, IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconHelpCircle, IconLoader, IconRefresh, IconMenu2, IconLock, IconWorld, IconCalendar, IconClock, IconMapPin, IconPhone, IconSend, IconMessageCircle, IconChartBar, IconTrendingUp, IconTrendingDown, IconActivity, IconBolt, IconShield, IconDatabase, IconCode, IconTerminal, IconFileText, IconFolder, IconPhoto, IconTag, IconBrain, IconCards, IconDiamond, IconCurrencyDollar.

---

## Theming pattern for screens

```tsx
export default function MyScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScreenBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingBottom: spacing[8],
            gap: spacing[6],
          }}
        >
          {/* sections */}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
```

---

## Dark mode

Automatic via `prefers-color-scheme` / `useColorScheme()`. Every component must work in both modes — never hardcode colors that only look right in one mode. Test both before merging.

---

## Layout constants — `src/constants/layout.ts`

```ts
HORIZONTAL_PADDING = 16
MIN_TOUCH_TARGET   = 44     // Apple HIG minimum
HEADER_HEIGHT      = 180
TAB_BAR_HEIGHT     = 85
```

---

## Anti-patterns — never do these

1. ❌ Hardcoded hex/rgba in component styles (`#4B5EFC`, `'rgba(0,0,0,0.5)'`)
2. ❌ Hex alpha concatenation (`colors.primary + '15'`) — use `withAlpha`
3. ❌ Raw `<RNText>` with inline `fontSize` — use `<Text variant>`
4. ❌ Numeric spacing literals (`padding: 16`) — use `spacing[4]`
5. ❌ Fabricated icon names or icons without `Icon` prefix
6. ❌ NativeWind `className` (Tailwind config is dead code)
7. ❌ Lucide icons (we use Tabler)
8. ❌ Skipping `useTheme()` and reading colors from a stale prop
9. ❌ Components that only work in light mode
10. ❌ Touch targets smaller than 44×44

---

## Where to look

- **Tokens:** `src/theme/tokens.ts`
- **Provider:** `src/theme/ThemeProvider.tsx`
- **Components:** `src/components/` (barrel: `src/components/index.ts`)
- **Layout constants:** `src/constants/layout.ts`
- **Alpha util:** `src/utils/withAlpha.ts`
- **Live viewer:** route `/design-system` in the app
- **Rules:** `.claude/rules/design-tokens.md`, `.claude/rules/component-patterns.md`, `.claude/rules/responsive.md`
