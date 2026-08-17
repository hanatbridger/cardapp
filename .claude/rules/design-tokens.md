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

Aligned to **Brand Book v1.1 (April 2026, WCAG AAA)**. When the book and the code disagree, the book wins — update `src/theme/tokens.ts` and every consumer rebinds.

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#4B5EFC` | `#6B7CFF` | Indigo — primary brand, buttons, links, focus |
| `onPrimary` | `#FFFFFF` | `#101559` | Text on primary fills |
| `indigoLift` | `#A5B0FF` | `#A5B0FF` | Logo facet, subtle brand highlights |
| `primaryContainer` | `#EDF0FF` | `#101559` | Tonal/soft primary backgrounds |
| `surface` | `#FFFFFF` | `#0D1117` | Canvas — page background |
| `surfaceVariant` | `#F9FAFB` | `#161B22` | Surface — card/section background |
| `surfaceElevated` | `#FFFFFF` | `#1F2937` | Elevated — modal/dropdown |
| `onSurface` | `#111827` | `#F9FAFB` | Primary text (16:1 AAA on canvas) |
| `onSurfaceVariant` | `#4B5563` | `#D1D5DB` | Secondary text (10.9:1 AAA) |
| `onSurfaceMuted` | `#6B7280` | `#9CA3AF` | Tertiary text (7.2:1 AAA) |

**Teal is deprecated.** Brand book v1.1 dropped the `#1E97AD` teal in favor of a single-brand-color system. Do not reintroduce `colors.secondary*`.
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

**Font:** Space Grotesk only. Weights locked to **400, 500, 700** per brand book — never use 600. No pairing with any other typeface (no JetBrainsMono, no Inter, no system fallback).

### Brand book v1.1 scales (canonical — use for new screens)

| Variant | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 56 | 700 | -2.4 | Hero headlines |
| `headline` | 32 | 700 | -1.2 | Page titles |
| `title` | 20 | 500 | -0.4 | Section headings, card titles |
| `body` | 15 | 400 | 0 | Default body |
| `caption` | 12 | 500 | 0.4 | Metadata, UPPERCASE labels |
| `numerals` | 24 | 500 | -0.2 | **Prices — tabular-nums applied automatically** |

### Legacy phone-ergonomic ramp (in use across existing screens)

Weights normalized to book-compliant 400/500/700. When updating a screen, prefer the canonical scales above.

| Variant | Size | Weight | Use |
|---|---|---|---|
| `displayLg` | 48 | 700 | Large hero |
| `displayMd` | 36 | 700 | Page titles |
| `displaySm` | 30 | 700 | Section heroes |
| `headingLg` | 24 | 700 | Section headings |
| `headingMd` | 20 | 700 | Subsections |
| `headingSm` | 16 | 700 | Card titles |
| `bodyLg/Md/Sm` | 18/16/14 | 400 | Body |
| `labelLg/Md/Sm` | 14/12/11 | 500 | Buttons, badges |
| `overline` | 11 | 500 | CAPS labels |

**Prices must use tabular figures.** Either the `numerals` variant (auto) or pass `style={{ fontVariant: ['tabular-nums'] }}` on any other Text.

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
