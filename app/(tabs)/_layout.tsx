import { Tabs } from 'expo-router';
import { View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconHome, IconBell, IconUser, IconSearch } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius, shadows } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors, glass } = useTheme();
  const insets = useSafeAreaInsets();

  // Left group: Home, Search, Profile
  const leftTabs = ['index', 'search', 'profile'];
  const icons: Record<string, typeof IconHome> = {
    index: IconHome,
    search: IconSearch,
    profile: IconUser,
  };

  // Notifications is separate on the right
  const alertRoute = state.routes.find((r: any) => r.name === 'notifications');
  const alertFocused = alertRoute ? state.index === state.routes.indexOf(alertRoute) : false;

  return (
    <View
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
      {/* Left group — main tabs */}
      <View
        style={{
          flex: 1,
          backgroundColor: glass.backgroundStrong,
          borderRadius: radius['2xl'],
          borderWidth: 1,
          borderColor: glass.border,
          flexDirection: 'row',
          paddingVertical: spacing[1],
          paddingHorizontal: spacing[2],
          justifyContent: 'space-around',
          alignItems: 'center',
          ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as any
            : {}),
        }}
      >
        {leftTabs.map((tabName) => {
          const route = state.routes.find((r: any) => r.name === tabName);
          if (!route) return null;
          const realIndex = state.routes.indexOf(route);
          const isFocused = state.index === realIndex;
          const IconComponent = icons[tabName] || IconHome;

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
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                height: 40,
                borderRadius: radius.xl,
                backgroundColor: isFocused ? withAlpha(colors.primary, 0.15) : 'transparent',
              }}
            >
              <IconComponent
                size={22}
                color={isFocused ? colors.primary : colors.onSurfaceMuted}
                strokeWidth={isFocused ? 2 : 1.5}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Notifications button — separate on the right */}
      <Pressable
        onPress={() => {
          if (alertRoute) {
            Haptics.selectionAsync();
            navigation.navigate('notifications');
          }
        }}
        hitSlop={8}
        accessibilityLabel="Notifications"
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.xl,
          backgroundColor: alertFocused ? colors.primary : glass.backgroundStrong,
          borderWidth: 1,
          borderColor: alertFocused ? colors.primary : glass.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as any
            : {}),
        }}
      >
        <IconBell
          size={22}
          color={alertFocused ? colors.onPrimary : colors.onSurfaceMuted}
          strokeWidth={alertFocused ? 2.2 : 1.6}
        />
      </Pressable>
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
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="notifications" />
    </Tabs>
  );
}
