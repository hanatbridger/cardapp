import { Tabs } from 'expo-router';
import { View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Haptics } from '../../src/utils/haptics';
import { IconHome, IconBell, IconUser, IconSearch } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';

// Brand book v1.1 motif #3: floating tab bar.
// Left: standalone 64pt glass circle with Home.
// Right: flexible 64pt glass pill with Search · Bell · Profile.
// Both surfaces share the same liquid-glass recipe, and every tab —
// including Home — uses the same 48pt tonal-indigo active indicator so
// the four tabs feel like one control. Figma ref: node 60:2.
const BAR_HEIGHT = 64;
const HOME_SIZE = BAR_HEIGHT;
const ACTIVE_PILL_SIZE = 48;
const ICON_SIZE = 26;
const BLUR_INTENSITY = 40;

function FloatingTabBar({ state, navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const rightTabs = ['search', 'notifications', 'profile'];
  const icons: Record<string, typeof IconHome> = {
    search: IconSearch,
    notifications: IconBell,
    profile: IconUser,
  };

  const homeRoute = state.routes.find((r: any) => r.name === 'index');
  const homeFocused = homeRoute ? state.index === state.routes.indexOf(homeRoute) : false;

  // Liquid-glass surface — more translucent than before so the canvas
  // shows through; the higher BlurView intensity does the heavy lifting.
  const glassTint = isDark ? 'rgba(22, 27, 34, 0.40)' : 'rgba(255, 255, 255, 0.60)';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(17, 24, 39, 0.08)';

  const webGlass =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        } as any)
      : {};

  const renderGlassSurface = (shapeRadius: number) =>
    Platform.OS === 'web' ? (
      <View
        pointerEvents="none"
        style={{
          ...StyleAbsoluteFill,
          backgroundColor: glassTint,
          borderWidth: 1,
          borderColor: hairline,
          borderRadius: shapeRadius,
          ...webGlass,
        }}
      />
    ) : (
      <BlurView
        intensity={BLUR_INTENSITY}
        tint={isDark ? 'dark' : 'light'}
        style={{
          ...StyleAbsoluteFill,
          borderRadius: shapeRadius,
          borderWidth: 1,
          borderColor: hairline,
          overflow: 'hidden',
        }}
      />
    );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 8) + 4,
        left: spacing[4],
        right: spacing[4],
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
      }}
    >
      {/* Home — standalone glass circle. Same active treatment as the
          right-pill tabs: an inner 48pt tonal-indigo pill appears when
          focused, icon flips to primary. */}
      <Pressable
        onPress={() => {
          if (homeRoute) {
            Haptics.selectionAsync();
            navigation.navigate('index');
          }
        }}
        hitSlop={8}
        accessibilityLabel="Home"
        accessibilityRole="button"
        accessibilityState={{ selected: homeFocused }}
        style={{
          width: HOME_SIZE,
          height: HOME_SIZE,
          borderRadius: HOME_SIZE / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {renderGlassSurface(HOME_SIZE / 2)}
        <View
          style={{
            width: ACTIVE_PILL_SIZE,
            height: ACTIVE_PILL_SIZE,
            borderRadius: ACTIVE_PILL_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: homeFocused ? withAlpha(colors.primary, 0.15) : 'transparent',
          }}
        >
          <IconHome
            size={ICON_SIZE}
            color={homeFocused ? colors.primary : colors.onSurfaceVariant}
            strokeWidth={homeFocused ? 2 : 1.75}
          />
        </View>
      </Pressable>

      {/* Right group — Search, Bell, Profile in a glass pill. */}
      <View
        style={{
          flex: 1,
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          overflow: 'hidden',
        }}
      >
        {renderGlassSurface(BAR_HEIGHT / 2)}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing[2],
          }}
        >
          {rightTabs.map((tabName) => {
            const route = state.routes.find((r: any) => r.name === tabName);
            if (!route) return null;
            const realIndex = state.routes.indexOf(route);
            const isFocused = state.index === realIndex;
            const IconComponent = icons[tabName] || IconSearch;

            const onPress = () => {
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

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={tabName}
                style={{
                  flex: 1,
                  height: ACTIVE_PILL_SIZE,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isFocused ? withAlpha(colors.primary, 0.15) : 'transparent',
                }}
              >
                <IconComponent
                  size={ICON_SIZE}
                  color={isFocused ? colors.primary : colors.onSurfaceVariant}
                  strokeWidth={isFocused ? 2 : 1.75}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const StyleAbsoluteFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="notifications" />
    </Tabs>
  );
}
