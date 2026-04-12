# Design Tokens — CardPulse

**Source of truth:** `src/theme/tokens.ts` + `src/constants/layout.ts`
**Access in components:** `const { colors, typography, spacing, radius, shadows, glass } = useTheme()`
**Theme provider:** `src/theme/ThemeProvider.tsx` (auto light/dark via `useColorScheme()`)

## Hard rules

1. **Never hardcode hex/rgba colors in components.** Use `colors.*` from `useTheme()`.
2. **Never use raw numbers for spacing/radius/font sizes.** Use `spacing[N]`, `radius.*`, `typography.*`.
3. **Never append hex alpha strings** like `colors.primary + '15'`. Use the `withAlpha(color, 0.15)` util in `src/utils/withAlpha.ts`.
4. **Text always goes through `<Text variant="...">`** — never raw `<RNText>` with inline `fontSize`.
5. **Inline `style={{...}}` is the styling pattern.** No `className`, no NativeWind, no styled-components. Tailwind config exists but is dead code.
6. **Legitimate exceptions** (do not flag): `ErrorBoundary.tsx` (above provider, can't use hooks), `AuthForm.tsx` Apple Sign-In colors (HIG-mandated `#000000`/`#FFFFFF`).

## Color tokens (semantic — same names in light + dark)

Access via `colors.*`. Light/dark resolved automatically.

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#4B5EFC` | `#6B7CFF` | Primary actions, links, focus |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` | Text on primary fills |
| `primaryContainer` | `#EDF0FF` | `#1A2280` | Tonal/soft primary backgrounds |
| `onPrimaryContainer` | `#1A2280` | `#D4DBFF` | Text on primary container |
| `secondary` | `#1E97AD` | `#3AB6CC` | Secondary actions |
| `surface` | `#FFFFFF` | `#161B22` | Card/page background |
| `surfaceVariant` | `#F8F9FA` | `#1A1F2E` | Subtle surface (sidebar, headers) |
| `onSurface` | `#212529` | `#F1F3F5` | Primary text |
| `onSurfaceVariant` | `#6C757D` | `#ADB5BD` | Secondary/muted text |
| `outline` | `#E9ECEF` | `#343A40` | Borders, dividers |
| `outlineVariant` | `#F1F3F5` | `#1A1F2E` | Subtle borders |
| `success` | `#059669` | `#34D399` | Success, gains |
| `successContainer` | `#ECFDF5` | `#0A2E1F` | Success bg |
| `warning` | `#D97706` | `#FBBF24` | Warning |
| `warningContainer` | `#FFFBEB` | `#2E1F07` | Warning bg |
| `danger` | `#DC2626` | `#F87171` | Errors, losses, destructive |
| `dangerContainer` | `#FEF2F2` | `#2E0A0A` | Danger bg |
| `info` | `#4B5EFC` | `#6B7CFF` | Info |
| `skeleton` | `#F1F3F5` | `#1A1F2E` | Skeleton placeholder |

## Typography (`typography.*`)

Use via `<Text variant="bodyMd">` etc. Never inline `fontSize`.

| Variant | Size | Weight | Line | Use |
|---|---|---|---|---|
| `displayLg` | 48 | 700 | 53 | Hero headlines |
| `displayMd` | 36 | 700 | 41 | Page titles |
| `displaySm` | 30 | 600 | 36 | Section heroes |
| `headingLg` | 24 | 600 | 31 | Section headings |
| `headingMd` | 20 | 600 | 27 | Subsection headings |
| `headingSm` | 16 | 600 | 22 | Card titles |
| `bodyLg` | 18 | 400 | 29 | Long-form |
| `bodyMd` | 16 | 400 | 26 | **Default body** |
| `bodySm` | 14 | 400 | 21 | Compact text |
| `labelLg` | 14 | 500 | 20 | Buttons, nav |
| `labelMd` | 12 | 500 | 17 | Badges, tags |
| `labelSm` | 11 | 500 | 14 | Micro labels |
| `caption` | 12 | 400 | 17 | Metadata |
| `overline` | 11 | 600 | 14 | CAPS labels |

Font family: system default (Inter not bundled — uses platform sans).

## Spacing (`spacing[N]`) — 4px grid

| Key | px | Common use |
|---|---|---|
| `0` | 0 | — |
| `0.5` | 2 | Hairline |
| `1` | 4 | Icon-text inline |
| `1.5` | 6 | Tight inline |
| `2` | 8 | Compact gap |
| `3` | 12 | Tight component padding |
| `4` | 16 | **Default screen horizontal padding, stack gap** |
| `5` | 20 | Card padding |
| `6` | 24 | **Default card padding, section gap** |
| `8` | 32 | Section separation |
| `10` | 40 | Major spacing |
| `12` | 48 | Hero spacing |
| `16` | 64 | Page-level |
| `20` | 80 | — |
| `24` | 96 | — |
| `32` | 128 | — |

## Radius (`radius.*`)

| Token | px | Use |
|---|---|---|
| `none` | 0 | Sharp |
| `sm` | 6 | Inputs, chips |
| `md` | 12 | Buttons, badges |
| `lg` | 16 | Small cards |
| `xl` | 20 | **Default Card** |
| `2xl` | 24 | Modals, large panels |
| `3xl` | 32 | Heroes |
| `full` | 9999 | Pills, avatars |

## Shadows (`shadows.*`)

`sm`, `md`, `lg`, `xl`, `glass`. Use sparingly — prefer borders for flat UI. Reserve for floating elements (modals, dropdowns), drag states, elevated cards.

## Glass (`glass.light` / `glass.dark`)

Properties: `background`, `backgroundStrong`, `border`, `blur` (4). Used by `SearchBar`, `SegmentedControl`, `ScreenBackground`. Auto-resolved via `useTheme().glass`.

## Layout constants (`src/constants/layout.ts`)

```ts
HORIZONTAL_PADDING = 16     // screen edge padding
MIN_TOUCH_TARGET   = 44     // Apple HIG minimum
HEADER_HEIGHT      = 180    // home/list header
TAB_BAR_HEIGHT     = 85
CARD_BORDER_RADIUS = 12     // legacy — prefer radius.md
LARGE_CARD_BORDER_RADIUS = 20  // legacy — prefer radius.xl
```

## Alpha / opacity

Use `withAlpha(color, opacity)` from `src/utils/withAlpha.ts`. Accepts hex (`#RRGGBB`) or rgb and returns rgba. **Do not** concatenate hex alpha (`color + '15'`) — it produces invalid colors when `color` is rgba/hsl.

```ts
import { withAlpha } from '../utils/withAlpha';
backgroundColor: withAlpha(colors.primary, 0.15)
```

## Icons

Library: `@tabler/icons-react-native`. All exports use `Icon` prefix (`IconBell`, not `Bell`). Never fabricate names — only use icons verified at https://tabler.io/icons.

| Context | Size | strokeWidth |
|---|---|---|
| Dense | 16 | 1.5 |
| Default | 20 | 2 |
| Touch | 24 | 2 |
| Decorative | 32+ | 1.5 |

Color via `color={colors.onSurface}` prop.
