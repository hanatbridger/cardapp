import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Haptics } from '../../src/utils/haptics';
import { IconHome, IconBell, IconUser, IconSearch, IconNews } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing } from '../../src/theme/tokens';
import { useAlertsStore } from '../../src/stores/alerts-store';

// Liquid-glass floating tab bar — Apple-style frosted glass that FLOATS
// near the bottom edge; scene content scrolls underneath it (that live
// backdrop is what the blur frosts — do not dock it or give it a solid
// bg). Two surfaces sharing one glass recipe, echoing the brand motif:
//   [● Home]   [Search · News · Bell · Profile]
// The right capsule carries a raised glass pill that SLIDES between its
// tabs; the Home circle carries its own inner pill that fades in when
// Home is active (a pill can't slide across separate surfaces).
//
// The rgba tints, inset-shadow recipe, #ff3b30 badge red, and the SVG
// refraction filters below are SPEC-MANDATED values for this surface
// (Apple-style liquid glass), intentionally not theme tokens — same
// exception class as AuthForm's Apple HIG colors. Everything else
// (icon color, spacing) stays tokenized.
const TRACK_RADIUS = 100;
const TRACK_PAD = 4;
const ICON_SIZE = 26;
const ICON_STROKE = 2;
const ITEM_VPAD = 14;
// Capsule height = icon + item padding + track padding; the Home circle
// matches it so the two surfaces read as one control.
const BAR_HEIGHT = ICON_SIZE + ITEM_VPAD * 2 + TRACK_PAD * 2; // 62
const BLUR_INTENSITY = 32;
const FADE_MS = 240;
const SLIDE_SPRING = { tension: 58, friction: 12 };
// Friction damps the pop so it lands ON the 1.10 spec value; at friction
// 10 this spring overshot past 1.13 and rang, which reads as a glitch.
const POP_SPRING = { tension: 300, friction: 22 };
const POP_SCALE = 1.1;
const INACTIVE_OPACITY = 0.2;

// Display order — icon-only; labels survive as a11y names. Home is a
// standalone circle; the rest live in the right capsule.
const HOME_TAB = { name: 'index', label: 'Home', Icon: IconHome } as const;
const RIGHT_TABS = [
  { name: 'search', label: 'Search', Icon: IconSearch },
  { name: 'news', label: 'News', Icon: IconNews },
  { name: 'notifications', label: 'Notifications', Icon: IconBell },
  { name: 'profile', label: 'Profile', Icon: IconUser },
] as const;
const ALL_TABS = [HOME_TAB, ...RIGHT_TABS] as const;

// ── Web frosted glass ────────────────────────────────────────────────
// Baseline (Safari/Firefox): plain backdrop blur. Chromium upgrade:
// SVG displacement filters give real refraction — content scrolling
// under the bar visibly bends, which is the "liquid" part. Gated on
// CSS.supports('backdrop-filter','url(#x)'); injected once.
const WEB_GLASS_ID = 'cardpulse-liquid-glass';

function injectWebGlass() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(WEB_GLASS_ID)) return;

  const hasRefraction =
    typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'url(#x)');

  if (hasRefraction) {
    const defs = document.createElement('div');
    defs.id = `${WEB_GLASS_ID}-defs`;
    defs.setAttribute('aria-hidden', 'true');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs.innerHTML = `<svg><defs>
      <filter id="lg" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.013 0.018" numOctaves="2" seed="7" result="n"/>
        <feGaussianBlur in="n" stdDeviation="2.2" result="nb"/>
        <feDisplacementMap in="SourceGraphic" in2="nb" scale="28" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="lg-sm" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.026" numOctaves="2" seed="7" result="n"/>
        <feGaussianBlur in="n" stdDeviation="1.8" result="nb"/>
        <feDisplacementMap in="SourceGraphic" in2="nb" scale="16" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs></svg>`;
    document.body.appendChild(defs);
  }

  const style = document.createElement('style');
  style.id = WEB_GLASS_ID;
  // Filter chain order matters: refract (url) → soften (blur) → liven
  // (saturate). Inset shadows: top specular rim, bottom shade, hairline.
  style.textContent = hasRefraction
    ? `[data-glass="track"]{backdrop-filter:url(#lg) blur(2px) saturate(1.6);-webkit-backdrop-filter:url(#lg) blur(2px) saturate(1.6);box-shadow:inset 0 1px 1px rgba(255,255,255,0.40),inset 0 -1px 1px rgba(0,0,0,0.22),inset 0 0 0 1px rgba(255,255,255,0.10);}
[data-glass="pill"]{backdrop-filter:url(#lg-sm) blur(1px) saturate(1.5);-webkit-backdrop-filter:url(#lg-sm) blur(1px) saturate(1.5);box-shadow:inset 0 1px 1px rgba(255,255,255,0.50),inset 0 -1px 1px rgba(0,0,0,0.22),inset 0 0 0 1px rgba(255,255,255,0.14);}`
    : `[data-glass="track"]{backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);}`;
  document.head.appendChild(style);
}

const AbsoluteFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

// RN's types don't know react-native-web's dataSet prop (renders as
// data-* attributes, which the injected CSS targets).
const glassAttr = (kind: 'track' | 'pill') =>
  Platform.OS === 'web' ? ({ dataSet: { glass: kind } } as any) : null;

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);

  const focusedRoute = state.routes[state.index];
  const homeActive = focusedRoute.name === HOME_TAB.name;
  // Index within the right capsule; -1 while Home is active.
  const rightActiveIndex = RIGHT_TABS.findIndex((t) => t.name === focusedRoute.name);

  // Sliding pill position + press pop scale. One element translates —
  // never per-tab backgrounds. The pill fades out while Home is active;
  // Home's own inner pill fades in (opacity-crossfade between surfaces).
  const slideX = useRef(new Animated.Value(0)).current;
  // One pop scale PER SURFACE — a shared value made the Home pill swell
  // when a capsule tab was pressed (feedback under a finger that is not
  // there).
  const homePopScale = useRef(new Animated.Value(1)).current;
  const capsulePopScale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(rightActiveIndex >= 0 ? 1 : 0)).current;
  const homePillOpacity = useRef(new Animated.Value(homeActive ? 1 : 0)).current;
  const hasSnapped = useRef(false);
  // Previous capsule slot; -1 means Home was active, so the pill is
  // invisible and must be repositioned without a spring.
  const prevRightIndex = useRef(rightActiveIndex);
  // Per-tab icon dim/brighten crossfade.
  const fades = useRef(
    ALL_TABS.map((t) => new Animated.Value(t.name === focusedRoute.name ? 1 : INACTIVE_OPACITY)),
  ).current;

  const pillWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PAD * 2) / RIGHT_TABS.length : 0;

  useEffect(() => {
    injectWebGlass();
  }, []);

  // Snap into place on first layout, and again whenever we arrive from
  // Home — the pill is still faded out there, so springing it across
  // from its stale slot is motion the user never asked for. Spring only
  // between two visible capsule slots.
  useEffect(() => {
    const prev = prevRightIndex.current;
    prevRightIndex.current = rightActiveIndex;
    if (pillWidth <= 0 || rightActiveIndex < 0) return;
    const x = rightActiveIndex * pillWidth;
    if (!hasSnapped.current || prev < 0) {
      slideX.setValue(x);
      hasSnapped.current = true;
      return;
    }
    Animated.spring(slideX, { toValue: x, useNativeDriver: true, ...SLIDE_SPRING }).start();
  }, [rightActiveIndex, pillWidth, slideX]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pillOpacity, {
        toValue: rightActiveIndex >= 0 ? 1 : 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(homePillOpacity, {
        toValue: homeActive ? 1 : 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
      ...ALL_TABS.map((t, i) =>
        Animated.timing(fades[i], {
          toValue: t.name === focusedRoute.name ? 1 : INACTIVE_OPACITY,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, [focusedRoute.name, rightActiveIndex, homeActive, fades, pillOpacity, homePillOpacity]);

  const hasUnread = useAlertsStore((s) => s.triggered.some((t) => !t.isRead));

  // Respect per-screen `tabBarStyle: { display: 'none' }` (Explore's
  // focused-search overlay). AFTER all hooks — Rules of Hooks.
  const focusedOptions = descriptors?.[focusedRoute.key]?.options;
  if (focusedOptions?.tabBarStyle?.display === 'none') return null;

  // Tints UNDER the blur (spec values).
  const trackTint = isDark ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.05)';
  const pillFill = isDark ? 'rgba(255,255,255,0.10)' : '#ffffff';
  const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.08)';

  // Pop only the surface under the finger, and only when that tab is
  // already focused — an unfocused tab slides the pill instead. popOut
  // is unconditional so a scale can never be left stranded.
  const popIn = (scale: Animated.Value, isFocused: boolean) => {
    if (!isFocused) return;
    Animated.spring(scale, { toValue: POP_SCALE, useNativeDriver: true, ...POP_SPRING }).start();
  };
  const popOut = (scale: Animated.Value) =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...POP_SPRING }).start();

  // Shadow lives on WRAPPERS — both glass surfaces are overflow:hidden
  // and would clip their own shadows.
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    // Android elevation needs a background to cast from.
    android: { elevation: 16, backgroundColor: trackTint },
    web: { boxShadow: '0 10px 20px rgba(0,0,0,0.40)' } as any,
    default: {},
  });

  const tabPress = (route: any, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      Haptics.selectionAsync();
      navigation.navigate(route.name);
    }
  };

  const homeRoute = state.routes.find((r: any) => r.name === HOME_TAB.name);

  return (
    // pointerEvents lives in style (not a prop) for Fabric/New-Arch
    // reliability — box-none so taps in the side margins fall through
    // to content scrolling beneath the floating bar.
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        paddingHorizontal: spacing[4],
        paddingBottom: insets.bottom + 10,
        pointerEvents: 'box-none',
      }}
    >
      {/* ── Home — standalone glass circle ── */}
      {homeRoute && (
        <View style={{ borderRadius: BAR_HEIGHT / 2, ...shadowStyle }}>
          <Pressable
            onPress={() => tabPress(homeRoute, homeActive)}
            onPressIn={() => popIn(homePopScale, homeActive)}
            onPressOut={() => popOut(homePopScale)}
            accessibilityRole="button"
            accessibilityState={{ selected: homeActive }}
            accessibilityLabel={HOME_TAB.label}
            {...glassAttr('track')}
            style={{
              width: BAR_HEIGHT,
              height: BAR_HEIGHT,
              borderRadius: BAR_HEIGHT / 2,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              ...(Platform.OS !== 'web' ? { borderWidth: 1, borderColor: hairline } : null),
            }}
          >
            {Platform.OS !== 'web' && (
              <BlurView
                intensity={BLUR_INTENSITY}
                tint={isDark ? 'dark' : 'light'}
                style={{ ...AbsoluteFill, pointerEvents: 'none' }}
              />
            )}
            <View style={{ ...AbsoluteFill, backgroundColor: trackTint, pointerEvents: 'none' }} />
            {/* Home's raised pill — fades in when Home is active. */}
            <Animated.View
              {...glassAttr('pill')}
              style={{
                position: 'absolute',
                top: TRACK_PAD,
                bottom: TRACK_PAD,
                left: TRACK_PAD,
                right: TRACK_PAD,
                borderRadius: (BAR_HEIGHT - TRACK_PAD * 2) / 2,
                backgroundColor: pillFill,
                opacity: homePillOpacity,
                transform: [{ scale: homePopScale }],
                pointerEvents: 'none',
              }}
            />
            <Animated.View style={{ opacity: fades[0] }}>
              <HOME_TAB.Icon size={ICON_SIZE} color={colors.onSurface} strokeWidth={ICON_STROKE} />
            </Animated.View>
          </Pressable>
        </View>
      )}

      {/* ── Right capsule — Search · News · Bell · Profile ── */}
      <View style={{ flex: 1, borderRadius: TRACK_RADIUS, ...shadowStyle }}>
        <View
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          {...glassAttr('track')}
          style={{
            flexDirection: 'row',
            borderRadius: TRACK_RADIUS,
            padding: TRACK_PAD,
            overflow: 'hidden',
            ...(Platform.OS !== 'web' ? { borderWidth: 1, borderColor: hairline } : null),
          }}
        >
          {/* Native frost: BlurView behind a translucent tint fill. On
              web the blur/refraction comes from the injected CSS. */}
          {Platform.OS !== 'web' && (
            <BlurView
              intensity={BLUR_INTENSITY}
              tint={isDark ? 'dark' : 'light'}
              style={{ ...AbsoluteFill, pointerEvents: 'none' }}
            />
          )}
          <View style={{ ...AbsoluteFill, backgroundColor: trackTint, pointerEvents: 'none' }} />

          {/* The raised glass pill — slides to the active tab. */}
          {pillWidth > 0 && (
            <Animated.View
              {...glassAttr('pill')}
              style={{
                position: 'absolute',
                top: TRACK_PAD,
                bottom: TRACK_PAD,
                left: TRACK_PAD,
                width: pillWidth,
                borderRadius: TRACK_RADIUS,
                backgroundColor: pillFill,
                opacity: pillOpacity,
                transform: [{ translateX: slideX }, { scale: capsulePopScale }],
                pointerEvents: 'none',
              }}
            />
          )}

          {RIGHT_TABS.map((tab, i) => {
            const route = state.routes.find((r: any) => r.name === tab.name);
            if (!route) return null;
            const isFocused = focusedRoute.name === tab.name;
            const showDot = tab.name === 'notifications' && hasUnread;

            return (
              <Pressable
                key={route.key}
                onPress={() => tabPress(route, isFocused)}
                onPressIn={() => popIn(capsulePopScale, isFocused)}
                onPressOut={() => popOut(capsulePopScale)}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={tab.label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: ITEM_VPAD,
                }}
              >
                <View>
                  <Animated.View style={{ opacity: fades[i + 1] }}>
                    <tab.Icon size={ICON_SIZE} color={colors.onSurface} strokeWidth={ICON_STROKE} />
                  </Animated.View>
                  {/* Unread dot sits OUTSIDE the opacity fade so it stays
                      bright while its tab is idle. Ring in the track fill
                      color so it reads over the glyph. */}
                  {showDot && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -4,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#ff3b30',
                        borderWidth: 1.5,
                        borderColor: trackTint,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="news" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="notifications" />
    </Tabs>
  );
}
