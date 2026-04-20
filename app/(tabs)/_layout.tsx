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
// Pill on the right, standalone circle on the left.
// Liquid-glass: `BlurView` on native, backdrop-filter on web.
// Taller (64pt) with larger 26pt icons per the April '26 Figma refresh
// (node 60:2).
const BAR_HEIGHT = 64;
const HOME_SIZE = BAR_HEIGHT; // square home circle matches bar height
const ICON_SIZE = 26;
const BLUR_INTENSITY = 28;

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

  // Platform-specific glass surface. BlurView on native for real blur;
  // a translucent View with backdrop-filter on web. Both wrap a semi-
  // transparent tint to keep the pill readable over bright canvases.
  const glassTint = isDark ? 'rgba(22, 27, 34, 0.55)' : 'rgba(255, 255, 255, 0.55)';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(17, 24, 39, 0.08)';

  const webGlass =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)' } as any)
      : {};

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
      {/* Home — standalone circle. Active = solid indigo fill, white icon.
          Inactive = glass pill matching the right group. */}
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
        }}
      >
        {homeFocused ? (
          <View
            style={{
              width: HOME_SIZE,
              height: HOME_SIZE,
              borderRadius: HOME_SIZE / 2,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconHome size={ICON_SIZE} color={colors.onPrimary} strokeWidth={2} />
          </View>
        ) : (
          <>
            {Platform.OS === 'web' ? (
              <View
                style={{
                  position: 'absolute',
                  width: HOME_SIZE,
                  height: HOME_SIZE,
                  borderRadius: HOME_SIZE / 2,
                  backgroundColor: glassTint,
                  borderWidth: 1,
                  borderColor: hairline,
                  ...webGlass,
                }}
              />
            ) : (
              <BlurView
                intensity={BLUR_INTENSITY}
                tint={isDark ? 'dark' : 'light'}
                style={{
                  position: 'absolute',
                  width: HOME_SIZE,
                  height: HOME_SIZE,
                  borderRadius: HOME_SIZE / 2,
                  borderWidth: 1,
                  borderColor: hairline,
                  overflow: 'hidden',
                }}
              />
            )}
            <View
              style={{
                width: HOME_SIZE,
                height: HOME_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconHome size={ICON_SIZE} color={colors.onSurfaceVariant} strokeWidth={1.75} />
            </View>
          </>
        )}
      </Pressable>

      {/* Right group — Search, Notifications, Profile in a glass pill. */}
      <View
        style={{
          flex: 1,
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          overflow: 'hidden',
        }}
      >
        {Platform.OS === 'web' ? (
          <View
            style={{
              ...StyleAbsoluteFill,
              backgroundColor: glassTint,
              borderWidth: 1,
              borderColor: hairline,
              borderRadius: BAR_HEIGHT / 2,
              ...webGlass,
            }}
          />
        ) : (
          <BlurView
            intensity={BLUR_INTENSITY}
            tint={isDark ? 'dark' : 'light'}
            style={{
              ...StyleAbsoluteFill,
              borderRadius: BAR_HEIGHT / 2,
              borderWidth: 1,
              borderColor: hairline,
              overflow: 'hidden',
            }}
          />
        )}
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
                  height: 48,
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

// StyleSheet.absoluteFill values inlined as an object literal so the
// BlurView / View can spread them into extra style props.
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
