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

  // Right group: Search, Notifications, Profile
  const rightTabs = ['search', 'notifications', 'profile'];
  const icons: Record<string, typeof IconHome> = {
    search: IconSearch,
    notifications: IconBell,
    profile: IconUser,
  };

  // Home is standalone on the left
  const homeRoute = state.routes.find((r: any) => r.name === 'index');
  const homeFocused = homeRoute ? state.index === state.routes.indexOf(homeRoute) : false;

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
      {/* Home button — standalone circle on the left */}
      <Pressable
        onPress={() => {
          if (homeRoute) {
            Haptics.selectionAsync();
            navigation.navigate('index');
          }
        }}
        hitSlop={8}
        accessibilityLabel="Home"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: glass.backgroundStrong,
          borderWidth: 1,
          borderColor: glass.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as any
            : {}),
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.xl,
            backgroundColor: homeFocused ? withAlpha(colors.primary, 0.15) : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconHome
            size={22}
            color={homeFocused ? colors.primary : colors.onSurfaceMuted}
            strokeWidth={homeFocused ? 2 : 1.6}
          />
        </View>
      </Pressable>

      {/* Right group — Search, Notifications, Profile */}
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
