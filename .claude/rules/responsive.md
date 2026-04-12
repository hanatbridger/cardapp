# Responsive & Platform — CardPulse

**Targets:** iOS, Android, Web (Expo Router). Mobile-first. App Store launch is iOS-primary.

## Platform guards

- Use `Platform.OS === 'web'` early returns for native-only APIs (Haptics, Share fallback, etc.)
- `navigator.share` for web share, fall back to clipboard
- AsyncStorage works on all 3 platforms via Zustand persist

## Safe areas

- Wrap screen roots in `SafeAreaView` from `react-native-safe-area-context`
- Header height: `HEADER_HEIGHT = 180`
- Tab bar height: `TAB_BAR_HEIGHT = 85`
- Bottom inset: respect via `useSafeAreaInsets().bottom`

## Touch targets

- Minimum **44×44** (Apple HIG) — `MIN_TOUCH_TARGET` constant
- Use `hitSlop` to expand small icons without enlarging visual

## Spacing

- Default screen horizontal padding: `HORIZONTAL_PADDING = 16` (`spacing[4]`)
- Section gap: `spacing[6]` (24)
- Card internal padding: `spacing[6]` (24)

## Text sizing

- Body default: `bodyMd` (16) — meets accessibility minimum
- Never go below 11pt (`labelSm`/`overline`)
- Support Dynamic Type via `Text` variants — sizes already meet iOS minimums

## Lists

- Use `FlatList` for dynamic data; switch to `FlashList` for >50 items (perf checklist item)
- `keyExtractor` always provided
- Memoize row components with `React.memo`

## Dark mode

- Auto via `useColorScheme()` in `ThemeProvider`
- All `colors.*` tokens defined for both modes
- Test every screen in both modes before merging

## Web-specific

- Hover states via `Pressable` `style={({ hovered }) => ...}` (web only)
- Avoid native-only modules without `Platform.select`
- Animated gradients should pause on `document.hidden` (perf checklist item)

## Breakpoints

CardPulse is a phone-first app — no tablet/desktop breakpoints currently.
If adding tablet later, follow Material 3 breakpoints (compact <600, medium 600–840, expanded >840).

## Performance

- Pause `ScreenBackground` animation when blurred
- Prefetch top trending images on app start
- Lazy-load heavy charts off-screen
- Use `removeClippedSubviews` on long horizontal carousels
