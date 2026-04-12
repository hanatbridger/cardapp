import React from 'react';
import { View, Pressable } from 'react-native';
import { IconTrendingUp, IconHeart, IconMessageCircle, IconUserPlus } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import type { Notification } from '../types/social';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const ICON_TYPES = {
  price_alert: { Icon: IconTrendingUp, colorKey: 'primary' as const },
  like: { Icon: IconHeart, colorKey: 'danger' as const },
  comment: { Icon: IconMessageCircle, colorKey: 'success' as const },
  follow: { Icon: IconUserPlus, colorKey: 'warning' as const },
};

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
}

export const NotificationItem = React.memo(function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { colors } = useTheme();
  const iconConfig = ICON_TYPES[notification.type];
  const iconColor = colors[iconConfig.colorKey];

  return (
    <Pressable
      onPress={() => onPress?.(notification)}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}: ${notification.message}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        padding: spacing[4],
        gap: spacing[3],
        backgroundColor: pressed
          ? colors.surfaceVariant
          : notification.isRead
            ? 'transparent'
            : withAlpha(colors.primaryContainer, 0.3),
        alignItems: 'flex-start',
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          backgroundColor: withAlpha(iconColor, 0.15),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <iconConfig.Icon size={18} color={iconColor} />
      </View>

      <View style={{ flex: 1, gap: spacing['0.5'] }}>
        <Text variant="labelLg">{notification.title}</Text>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>
          {notification.message}
        </Text>
        <Text variant="caption" color={colors.onSurfaceMuted}>
          {timeAgo(notification.createdAt)}
        </Text>
      </View>

      {!notification.isRead && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: radius.full,
            backgroundColor: colors.primary,
            marginTop: spacing[1],
          }}
        />
      )}
    </Pressable>
  );
});
