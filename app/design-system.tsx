import React, { useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import {
  IconChevronLeft,
  IconSearch,
  IconHeart,
  IconBell,
  IconHome,
  IconUser,
} from '@tabler/icons-react-native';
import {
  Text,
  Button,
  Card,
  Input,
  Badge,
  GradeBadge,
  PriceChange,
  PriceChart,
  Avatar,
  SegmentedControl,
  EmptyState,
  SearchBar,
  Skeleton,
  WatchlistCard,
  CardSearchResult,
  NotificationItem,
  AIPicks,
  PriceAlertModal,
  WatchlistFullModal,
  AnimatedListItem,
  AuthForm,
  TokenEditorPanel,
  withErrorBoundary,
} from '../src/components';
import { MOCK_CARDS } from '../src/mocks';
import { MOCK_NOTIFICATIONS } from '../src/mocks';
import { useTheme } from '../src/theme/ThemeProvider';
import { spacing, radius, typography, shadows } from '../src/theme/tokens';
import { withAlpha } from '../src/utils/withAlpha';

// ── Sidebar nav items ──────────────────────────────────────
const NAV_ITEMS = [
  { key: 'colors', label: 'Colors', emoji: '\u25CF' },
  { key: 'typography', label: 'Typography', emoji: 'T' },
  { key: 'spacing', label: 'Spacing', emoji: '\u2014' },
  { key: 'radii', label: 'Radii', emoji: '\u25CB' },
  { key: 'shadows', label: 'Shadows', emoji: '\u25A0' },
  { key: 'components', label: 'Components', emoji: '\u2756' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

// ── Section wrapper ────────────────────────────────────────
function SectionBlock({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing[4], marginBottom: spacing[8] }}>
      <View style={{ gap: spacing[1] }}>
        <Text variant="headingLg">{title}</Text>
        {description && <Text variant="bodySm" color={colors.onSurfaceMuted}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}

// ── Color swatch card ──────────────────────────────────────
function ColorSwatch({ name, color, description }: { name: string; color: string; description?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 150 }}>
      <View style={{ height: 80, backgroundColor: color, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outline, marginBottom: spacing[2], justifyContent: 'flex-end', padding: spacing[3] }}>
        <Text variant="labelMd" color={isLightColor(color) ? '#000' : '#FFF'}>{name}</Text>
        <Text variant="caption" color={isLightColor(color) ? '#333' : '#CCC'}>{color}</Text>
      </View>
      {description && <Text variant="caption" color={colors.onSurfaceMuted}>{description}</Text>}
    </View>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// ── Semantic token row ─────────────────────────────────────
function TokenRow({ name, color, usage }: { name: string; color: string; usage: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: color, borderWidth: 1, borderColor: colors.outline, marginRight: spacing[3] }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text variant="labelMd">{name}</Text>
          <Text variant="caption" color={colors.onSurfaceMuted}>{color}</Text>
        </View>
        <Text variant="caption" color={colors.onSurfaceMuted}>{usage}</Text>
      </View>
    </View>
  );
}

// ── Floating tab bar preview ───────────────────────────────
// Static mirror of app/(tabs)/_layout.tsx FloatingTabBar used in the
// design-system screen. Must track it — when the real bar changes,
// update this preview too so the design system stays faithful.
const TAB_BAR_HEIGHT = 64;
const TAB_ICON_SIZE = 26;

function TabBarPreview({ activeIndex }: { activeIndex: number }) {
  const { colors, isDark } = useTheme();
  const glassTint = isDark ? 'rgba(22, 27, 34, 0.40)' : 'rgba(255, 255, 255, 0.60)';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(17, 24, 39, 0.08)';
  const ACTIVE_PILL = 48;
  const tabs = [
    { key: 'home', Icon: IconHome },
    { key: 'search', Icon: IconSearch },
    { key: 'notifications', Icon: IconBell },
    { key: 'profile', Icon: IconUser },
  ] as const;
  const [, ...right] = tabs;
  const homeActive = activeIndex === 0;

  const Glass = ({ style }: { style?: any }) =>
    Platform.OS === 'web' ? (
      <View
        pointerEvents="none"
        style={[
          style,
          { backgroundColor: glassTint, borderWidth: 1, borderColor: hairline },
          { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } as any,
        ]}
      />
    ) : (
      <BlurView
        pointerEvents="none"
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        style={[style, { borderWidth: 1, borderColor: hairline, overflow: 'hidden' }]}
      />
    );

  const activePill = (isActive: boolean) => ({
    width: ACTIVE_PILL,
    height: ACTIVE_PILL,
    borderRadius: ACTIVE_PILL / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: isActive ? withAlpha(colors.primary, 0.15) : 'transparent',
  });

  return (
    <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
      {/* Home — glass circle with the same inner active pill as the right group. */}
      <View
        style={{
          width: TAB_BAR_HEIGHT,
          height: TAB_BAR_HEIGHT,
          borderRadius: TAB_BAR_HEIGHT / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Glass
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: TAB_BAR_HEIGHT / 2 }}
        />
        <View style={activePill(homeActive)}>
          <IconHome
            size={TAB_ICON_SIZE}
            color={homeActive ? colors.primary : colors.onSurfaceVariant}
            strokeWidth={homeActive ? 2 : 1.75}
          />
        </View>
      </View>
      {/* Right pill */}
      <View style={{ flex: 1, height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2, overflow: 'hidden' }}>
        <Glass
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: TAB_BAR_HEIGHT / 2 }}
        />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[2] }}>
          {right.map((tab, i) => {
            const isActive = activeIndex === i + 1;
            return (
              <View key={tab.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={activePill(isActive)}>
                  <tab.Icon
                    size={TAB_ICON_SIZE}
                    color={isActive ? colors.primary : colors.onSurfaceVariant}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Type scale variants ────────────────────────────────────
const TYPE_VARIANTS = [
  'displayLg', 'displayMd', 'displaySm',
  'headingLg', 'headingMd', 'headingSm',
  'bodyLg', 'bodyMd', 'bodySm',
  'labelLg', 'labelMd', 'labelSm',
  'caption', 'overline',
] as const;

// ── Main screen ────────────────────────────────────────────
function DesignSystemScreen() {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;
  const [activeSection, setActiveSection] = useState<NavKey>('colors');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);

  const sidebarWidth = 200;

  // ── Sidebar ──────────────────────────────────────────────
  const sidebar = (
    <View
      style={{
        width: sidebarWidth,
        borderRightWidth: 1,
        borderRightColor: colors.outlineVariant,
        paddingTop: spacing[6],
        paddingHorizontal: spacing[3],
        gap: spacing[1],
      }}
    >
      <View style={{ paddingHorizontal: spacing[3], marginBottom: spacing[6] }}>
        <Text variant="headingSm">Design system</Text>
      </View>
      {NAV_ITEMS.map(({ key, label, emoji }) => {
        const isActive = key === activeSection;
        return (
          <Pressable
            key={key}
            onPress={() => setActiveSection(key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
              paddingVertical: spacing[2] + 2,
              paddingHorizontal: spacing[3],
              borderRadius: radius.md,
              backgroundColor: isActive ? colors.primaryContainer : 'transparent',
            }}
          >
            <Text variant="labelMd" color={isActive ? colors.primary : colors.onSurfaceMuted} style={{ width: 18, textAlign: 'center' }}>
              {emoji}
            </Text>
            <Text variant="labelLg" color={isActive ? colors.primary : colors.onSurfaceVariant}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ── Content sections ─────────────────────────────────────
  const renderContent = () => {
    switch (activeSection) {
      case 'colors':
        return (
          <>
            <SectionBlock title="Brand palette" description="Core identity colors that define CardPulse's visual presence.">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
                <ColorSwatch name="primary" color={colors.primary} description="Indigo — primary brand. Buttons, links, accents." />
                <ColorSwatch name="indigoLift" color={colors.indigoLift} description="Indigo Lift — logo facet and subtle brand highlights." />
                <ColorSwatch name="primaryActive" color={colors.primaryActive} description="Pressed/active state of primary." />
                <ColorSwatch name="success" color={colors.success} description="Positive changes, gains, confirmations." />
                <ColorSwatch name="warning" color={colors.warning} description="Caution states, alerts." />
                <ColorSwatch name="danger" color={colors.danger} description="Errors, losses, destructive actions." />
                <ColorSwatch name="info" color={colors.info} description="Informational callouts." />
              </View>
            </SectionBlock>

            <SectionBlock title="Semantic tokens" description="Purpose-based aliases. Always prefer these over raw palette values in component code.">
              <View style={isDesktop ? { flexDirection: 'row', gap: spacing[4] } : { gap: spacing[4] }}>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[1] }}>
                    <Text variant="labelLg">Backgrounds</Text>
                    <Text variant="caption" color={colors.onSurfaceMuted}>Surface and container colors</Text>
                  </View>
                  <TokenRow name="surface" color={colors.surface} usage="Page background" />
                  <TokenRow name="surfaceVariant" color={colors.surfaceVariant} usage="Section / card background" />
                  <TokenRow name="surfaceElevated" color={colors.surfaceElevated} usage="Elevated card / modal surface" />
                  <TokenRow name="primaryContainer" color={colors.primaryContainer} usage="Tonal button / highlight fill" />
                  <TokenRow name="successContainer" color={colors.successContainer} usage="Success badge background" />
                  <TokenRow name="dangerContainer" color={colors.dangerContainer} usage="Error badge background" />
                </Card>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[1] }}>
                    <Text variant="labelLg">Text</Text>
                    <Text variant="caption" color={colors.onSurfaceMuted}>Foreground / label / link colors</Text>
                  </View>
                  <TokenRow name="onSurface" color={colors.onSurface} usage="Primary body text" />
                  <TokenRow name="onSurfaceVariant" color={colors.onSurfaceVariant} usage="Secondary text, metadata" />
                  <TokenRow name="onSurfaceMuted" color={colors.onSurfaceMuted} usage="Placeholder, disabled text" />
                  <TokenRow name="onPrimary" color={colors.onPrimary} usage="Text on primary buttons" />
                  <TokenRow name="outline" color={colors.outline} usage="Borders, dividers" />
                  <TokenRow name="outlineVariant" color={colors.outlineVariant} usage="Subtle borders" />
                </Card>
              </View>
            </SectionBlock>
          </>
        );

      case 'typography':
        return (
          <SectionBlock title="Type scale" description="Space Grotesk only. Weights locked to 400 / 500 / 700 (brand book). Numerals variant uses tabular figures for price alignment.">
            <Card>
              <View style={{ gap: spacing[3] }}>
                {TYPE_VARIANTS.map((variant) => {
                  const style = typography[variant];
                  return (
                    <View key={variant} style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'baseline' : 'flex-start', gap: isDesktop ? spacing[4] : spacing['0.5'], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
                      <Text variant={variant}>{variant}</Text>
                      <Text variant="caption" color={colors.onSurfaceMuted}>
                        {style.fontSize}px / weight {style.fontWeight} / line {Math.round(style.lineHeight)}px
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          </SectionBlock>
        );

      case 'spacing':
        return (
          <SectionBlock title="Spacing scale" description="4px base grid. Use spacing tokens instead of raw pixel values.">
            <Card>
              <View style={{ gap: spacing[2] }}>
                {([0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const).map((key) => {
                  const keyStr = String(key) as keyof typeof spacing;
                  const px = spacing[keyStr];
                  return (
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[1] }}>
                      <Text variant="labelMd" style={{ width: 80 }}>spacing[{JSON.stringify(key)}]</Text>
                      <Text variant="caption" color={colors.onSurfaceMuted} style={{ width: 40 }}>{px}px</Text>
                      <View style={{ width: px, height: 20, backgroundColor: colors.primary, borderRadius: radius.sm, minWidth: 2 }} />
                    </View>
                  );
                })}
              </View>
            </Card>
          </SectionBlock>
        );

      case 'radii':
        return (
          <SectionBlock title="Border radius" description="Consistent corner rounding across the app.">
            <Card>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[6] }}>
                {(['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] as const).map((key) => (
                  <View key={key} style={{ alignItems: 'center', gap: spacing[2] }}>
                    <View style={{ width: 64, height: 64, backgroundColor: colors.primary, borderRadius: radius[key] }} />
                    <Text variant="labelMd">{key}</Text>
                    <Text variant="caption" color={colors.onSurfaceMuted}>{radius[key]}px</Text>
                  </View>
                ))}
              </View>
            </Card>
          </SectionBlock>
        );

      case 'shadows':
        return (
          <SectionBlock title="Shadows" description="Elevation levels for layered interfaces.">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] }}>
              {(['sm', 'md', 'lg'] as const).map((key) => (
                <View key={key} style={{ alignItems: 'center', gap: spacing[2] }}>
                  <View style={{ width: 120, height: 80, backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, ...shadows[key], justifyContent: 'center', alignItems: 'center' }}>
                    <Text variant="labelMd">{key}</Text>
                  </View>
                </View>
              ))}
              <View style={{ alignItems: 'center', gap: spacing[2] }}>
                <View style={{
                  width: 120, height: 80, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center',
                  ...shadows.glass,
                  backgroundColor: withAlpha(colors.surface, 0.6),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.onSurface, 0.08),
                  ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as any : {}),
                }}>
                  <Text variant="labelMd">glass</Text>
                </View>
              </View>
            </View>
          </SectionBlock>
        );

      case 'components':
        return (
          <>
            {/* Buttons */}
            <SectionBlock title="Button" description="Primary action component. Supports 5 variants, 3 sizes, and loading/disabled states.">
              <Card>
                <View style={{ gap: spacing[4] }}>
                  <View style={{ gap: spacing[2] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Variants</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <Button variant="filled" onPress={() => {}}>Filled</Button>
                      <Button variant="tonal" onPress={() => {}}>Tonal</Button>
                      <Button variant="outlined" onPress={() => {}}>Outlined</Button>
                      <Button variant="ghost" onPress={() => {}}>Ghost</Button>
                      <Button variant="danger" onPress={() => {}}>Danger</Button>
                    </View>
                  </View>
                  <View style={{ gap: spacing[2] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Sizes</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] }}>
                      <Button size="sm" onPress={() => {}}>Small</Button>
                      <Button size="md" onPress={() => {}}>Medium</Button>
                      <Button size="lg" onPress={() => {}}>Large</Button>
                    </View>
                  </View>
                  <View style={{ gap: spacing[2] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>States</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <Button disabled onPress={() => {}}>Disabled</Button>
                      <Button loading onPress={() => {}}>Loading</Button>
                      <Button icon={<IconHeart size={16} color={colors.onPrimary} />} onPress={() => {}}>With Icon</Button>
                    </View>
                  </View>
                </View>
              </Card>
            </SectionBlock>

            {/* Card */}
            <SectionBlock title="Card" description="Container component with outline, elevated, and glass variants.">
              <View style={isDesktop ? { flexDirection: 'row', gap: spacing[3] } : { gap: spacing[3] }}>
                <Card style={{ flex: 1 }}><Text variant="bodyMd">Default (outline)</Text></Card>
                <Card elevated style={{ flex: 1 }}><Text variant="bodyMd">Elevated (shadow)</Text></Card>
                <Card glass style={{ flex: 1 }}><Text variant="bodyMd">Glass (blur)</Text></Card>
              </View>
            </SectionBlock>

            {/* Input */}
            <SectionBlock title="Input" description="Text input with label, error, hint, and icon support.">
              <Card>
                <View style={isDesktop ? { flexDirection: 'row', gap: spacing[4] } : { gap: spacing[3] }}>
                  <View style={{ flex: 1, gap: spacing[3] }}>
                    <Input label="Default" placeholder="Enter text..." value={inputValue} onChangeText={setInputValue} />
                    <Input label="With Error" placeholder="Invalid" error="Required field" value="" onChangeText={() => {}} />
                  </View>
                  <View style={{ flex: 1, gap: spacing[3] }}>
                    <Input label="With Hint" placeholder="Email" hint="We'll never share it" value="" onChangeText={() => {}} />
                    <Input label="With Icon" placeholder="Search..." icon={<IconSearch size={16} color={colors.onSurfaceMuted} />} value="" onChangeText={() => {}} />
                  </View>
                </View>
              </Card>
            </SectionBlock>

            {/* SearchBar */}
            <SectionBlock title="SearchBar" description="Full-width search input with clear button.">
              <View style={{ maxWidth: 480 }}>
                <SearchBar value={searchValue} onChangeText={setSearchValue} placeholder="Search Pokemon cards..." />
              </View>
            </SectionBlock>

            {/* Badges */}
            <SectionBlock title="Pulse chips" description="Categorical indicators following the brand book 03.1 recipe — 400-level fill at 18% alpha, 200-level text, 12px radius. Every chip carries one meaning.">
              <View style={isDesktop ? { flexDirection: 'row', gap: spacing[4] } : { gap: spacing[4] }}>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[3] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Tier 1 — Price movement</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <Badge variant="gain">▲ Gain</Badge>
                      <Badge variant="loss">▼ Loss</Badge>
                    </View>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Tier 2 — Valuation verdict</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <Badge variant="undervalued">Undervalued</Badge>
                      <Badge variant="overvalued">Overvalued</Badge>
                    </View>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Tier 3 — Grading status</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <Badge variant="graded">PSA 10</Badge>
                      <Badge variant="ungraded">Ungraded</Badge>
                    </View>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Tier 4 — Signals and scarcity</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <Badge variant="live">Live</Badge>
                      <Badge variant="trophy">Trophy</Badge>
                    </View>
                  </View>
                </Card>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[3] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Grade badges</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <GradeBadge grade="PSA10" />
                      <GradeBadge grade="UNGRADED" />
                    </View>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Small</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                      <GradeBadge grade="PSA10" size="sm" />
                      <GradeBadge grade="UNGRADED" size="sm" />
                    </View>
                  </View>
                </Card>
              </View>
            </SectionBlock>

            {/* PriceChange + Avatar */}
            <SectionBlock title="PriceChange & Avatar" description="Price movement indicators and user avatar with initials fallback.">
              <View style={isDesktop ? { flexDirection: 'row', gap: spacing[4] } : { gap: spacing[4] }}>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[3] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Price changes</Text>
                    <View style={{ flexDirection: 'row', gap: spacing[4] }}>
                      <PriceChange percent={5.56} size="lg" />
                      <PriceChange percent={-2.3} size="lg" />
                      <PriceChange percent={0} size="lg" />
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing[4] }}>
                      <PriceChange percent={12.5} size="sm" />
                      <PriceChange percent={-8.1} size="sm" />
                    </View>
                  </View>
                </Card>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[3] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Avatars</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                      <Avatar name="John Doe" size={48} />
                      <Avatar name="Jane Smith" size={40} />
                      <Avatar name="A" size={32} />
                    </View>
                  </View>
                </Card>
              </View>
            </SectionBlock>

            {/* SegmentedControl */}
            {/* Floating tab bar — UI motif #3 */}
            <SectionBlock title="Floating tab bar" description="Liquid-glass pill navigation. BlurView on native (pointerEvents none so the glass never swallows taps), backdrop-filter on web. 64pt tall, 26pt icons. Home is a standalone glass circle that shares the same 48pt tonal-indigo active indicator as the right-pill tabs — all four tabs read as one control. The right group is a glass pill with Search · Bell · Profile.">
              <Card padding={spacing[6]}>
                <View style={{ gap: spacing[4] }}>
                  <Text variant="labelMd" color={colors.onSurfaceMuted}>Default state (Home active)</Text>
                  <View style={{ height: 80, justifyContent: 'center' }}>
                    <TabBarPreview activeIndex={0} />
                  </View>
                  <Text variant="labelMd" color={colors.onSurfaceMuted}>Search active</Text>
                  <View style={{ height: 80, justifyContent: 'center' }}>
                    <TabBarPreview activeIndex={1} />
                  </View>
                </View>
              </Card>
            </SectionBlock>

            <SectionBlock title="SegmentedControl" description="Tab-like selector for toggling between options.">
              <View style={{ maxWidth: 320, gap: spacing[3] }}>
                <SegmentedControl options={['Raw', 'PSA 10']} selected={segmentIndex} onSelect={setSegmentIndex} />
                <SegmentedControl options={['1D', '1W', '1M', '3M']} selected={1} onSelect={() => {}} />
              </View>
            </SectionBlock>

            {/* Skeleton */}
            <SectionBlock title="Skeleton" description="Loading placeholder with animated opacity pulse.">
              <Card>
                <View style={{ gap: spacing[2], maxWidth: 400 }}>
                  <Skeleton width="80%" height={24} />
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="100%" height={12} />
                  <Skeleton width={120} height={36} borderRadius={radius.lg} />
                </View>
              </Card>
            </SectionBlock>

            {/* EmptyState */}
            <SectionBlock title="EmptyState" description="Placeholder for empty lists with optional action.">
              <Card style={{ maxWidth: 400 }}>
                <EmptyState
                  icon={<IconBell size={40} color={colors.onSurfaceMuted} />}
                  title="No notifications"
                  description="You'll see price alerts and updates here"
                  actionLabel="Browse Cards"
                  onAction={() => {}}
                />
              </Card>
            </SectionBlock>

            {/* PriceChart */}
            <SectionBlock title="PriceChart" description="Interactive SVG price chart with gradient fill and touch tracking.">
              <Card>
                <PriceChart
                  data={Array.from({ length: 30 }, (_, i) => ({
                    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
                    price: 120 + Math.sin(i / 3) * 20 + (i / 30) * 15 + (Math.random() - 0.5) * 8,
                  }))}
                  height={200}
                  width={Math.min(screenWidth - 120, 600)}
                  interactive
                />
              </Card>
            </SectionBlock>

            {/* WatchlistCard */}
            <SectionBlock title="WatchlistCard" description="Card component for watchlist items with price, grade, and valuation badge.">
              <View style={{ maxWidth: 500, gap: spacing[3] }}>
                <WatchlistCard
                  cardId={MOCK_CARDS[0].id}
                  cardName={MOCK_CARDS[0].name}
                  cardImageUrl={MOCK_CARDS[0].images.small}
                  setName={MOCK_CARDS[0].set.name}
                  grade="PSA10"
                  rarity={MOCK_CARDS[0].rarity}
                  fallbackPrice={{ cardName: MOCK_CARDS[0].name, grade: 'PSA10', currentPrice: 1560, previousPrice: 1500, percentChange: 4.0, lastSaleDate: '2026-04-10', lastSalePrice: 1555, averagePrice: 1520, highPrice: 1600, lowPrice: 1480, salesCount: 12, source: 'ebay' as const }}
                />
                <WatchlistCard
                  cardId={MOCK_CARDS[1].id}
                  cardName={MOCK_CARDS[1].name}
                  cardImageUrl={MOCK_CARDS[1].images.small}
                  setName={MOCK_CARDS[1].set.name}
                  grade="UNGRADED"
                  rarity={MOCK_CARDS[1].rarity}
                  fallbackPrice={{ cardName: MOCK_CARDS[1].name, grade: 'UNGRADED', currentPrice: 245, previousPrice: 230, percentChange: 6.52, lastSaleDate: '2026-04-11', lastSalePrice: 248, averagePrice: 235, highPrice: 260, lowPrice: 220, salesCount: 28, source: 'ebay' as const }}
                />
              </View>
            </SectionBlock>

            {/* CardSearchResult */}
            <SectionBlock title="CardSearchResult" description="Search result row for Pokemon card search.">
              <View style={{ maxWidth: 500, gap: spacing[2] }}>
                {MOCK_CARDS.slice(0, 3).map((card) => (
                  <CardSearchResult key={card.id} card={card} onPress={() => {}} />
                ))}
              </View>
            </SectionBlock>

            {/* NotificationItem */}
            <SectionBlock title="NotificationItem" description="Notification row with type icon, title, message, and read state.">
              <View style={{ maxWidth: 500, gap: spacing[1] }}>
                {MOCK_NOTIFICATIONS.slice(0, 4).map((notif) => (
                  <NotificationItem key={notif.id} notification={notif} onPress={() => {}} />
                ))}
              </View>
            </SectionBlock>

            {/* AIPicks */}
            <SectionBlock title="AIPicks" description="Horizontal card carousel showing AI-recommended undervalued or overvalued cards.">
              <AIPicks
                title="Undervalued Picks"
                type="undervalued"
                items={MOCK_CARDS.slice(0, 3).map((card) => ({
                  cardId: card.id,
                  cardName: card.name,
                  setName: card.set.name,
                  imageUrl: card.images.small,
                  marketPrice: 95,
                  predictedPrice: 130,
                  gapPercent: 36.8,
                  label: 'undervalued' as const,
                }))}
              />
            </SectionBlock>

            {/* AnimatedListItem */}
            <SectionBlock title="AnimatedListItem" description="Staggered fade-in + slide-up animation wrapper for list items.">
              <View style={{ maxWidth: 400, gap: spacing[2] }}>
                {[0, 1, 2, 3].map((i) => (
                  <AnimatedListItem key={i} index={i}>
                    <Card>
                      <Text variant="bodyMd">Animated item {i + 1}</Text>
                    </Card>
                  </AnimatedListItem>
                ))}
              </View>
            </SectionBlock>

            {/* AuthForm */}
            <SectionBlock title="AuthForm" description="Authentication form with email/password and Apple sign-in.">
              <View style={isDesktop ? { flexDirection: 'row', gap: spacing[4] } : { gap: spacing[4] }}>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[2] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Sign In</Text>
                    <AuthForm mode="signin" onSubmit={() => {}} onApple={() => {}} />
                  </View>
                </Card>
                <Card style={{ flex: 1 }}>
                  <View style={{ gap: spacing[2] }}>
                    <Text variant="labelMd" color={colors.onSurfaceMuted}>Sign Up</Text>
                    <AuthForm mode="signup" onSubmit={() => {}} onApple={() => {}} />
                  </View>
                </Card>
              </View>
            </SectionBlock>

            {/* Modals */}
            <SectionBlock title="Modals" description="PriceAlertModal and WatchlistFullModal triggered by buttons below.">
              <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                <Button variant="outlined" onPress={() => setAlertModalVisible(true)}>Price Alert Modal</Button>
                <Button variant="outlined" onPress={() => setWatchlistModalVisible(true)}>Watchlist Full Modal</Button>
              </View>
              <PriceAlertModal
                visible={alertModalVisible}
                onClose={() => setAlertModalVisible(false)}
                onSubmit={() => setAlertModalVisible(false)}
                cardName="Charizard ex"
                currentPrice={1560}
              />
              <WatchlistFullModal
                visible={watchlistModalVisible}
                onClose={() => setWatchlistModalVisible(false)}
                currentCount={5}
                maxCount={5}
              />
            </SectionBlock>
          </>
        );
    }
  };

  // ── Mobile layout (single column, no sidebar) ────────────
  if (!isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        {/* Mobile header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2], gap: spacing[3] }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: spacing[1] }}>
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Text variant="headingLg">Design System</Text>
        </View>
        {/* Mobile nav tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing[4], gap: spacing[2], paddingBottom: spacing[3] }}>
          {NAV_ITEMS.map(({ key, label, emoji }) => {
            const isActive = key === activeSection;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveSection(key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[1],
                  paddingVertical: spacing[2],
                  paddingHorizontal: spacing[3],
                  borderRadius: radius.full,
                  backgroundColor: isActive ? colors.primaryContainer : colors.surfaceVariant,
                }}
              >
                <Text variant="labelSm" color={isActive ? colors.primary : colors.onSurfaceMuted}>{emoji}</Text>
                <Text variant="labelMd" color={isActive ? colors.primary : colors.onSurfaceVariant}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Desktop layout (sidebar + content [+ editor panel]) ──
  // Token editor only mounts on web and ≥1024px — a 340pt right panel
  // doesn't fit alongside the 200pt sidebar and content on tablet-width
  // screens. Gated by __DEV__ so production web builds don't ship the
  // editor (users can still land on /design-system but see the
  // read-only view). iOS/Android never render it.
  const showEditor = __DEV__ && Platform.OS === 'web' && screenWidth >= 1024;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {sidebar}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing[8], maxWidth: 960 }}
          style={{ flex: 1 }}
        >
          {renderContent()}
        </ScrollView>
        {showEditor && <TokenEditorPanel />}
      </View>
    </SafeAreaView>
  );
}

export default withErrorBoundary(DesignSystemScreen, 'Design System');
