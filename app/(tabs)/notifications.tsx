import React, { useEffect, useMemo } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { IconBell } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, NotificationItem, EmptyState, ScreenBackground, withErrorBoundary } from '../../src/components';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useAlertsStore } from '../../src/stores/alerts-store';
import type { Notification } from '../../src/types/social';
import type { TriggeredAlert } from '../../src/stores/alerts-store';

function triggeredToNotification(t: TriggeredAlert): Notification {
  const direction = t.type === 'above' ? 'is now above' : 'dropped below';
  const gradeLabel = t.grade === 'PSA10' ? 'PSA 10' : 'Raw';
  return {
    id: t.id,
    type: 'price_alert',
    title: 'Price Alert',
    message: `${t.cardName} (${gradeLabel}) ${direction} $${t.targetPrice.toFixed(2)} — currently $${t.triggeredPrice.toFixed(2)}.`,
    cardId: t.cardId,
    isRead: t.isRead,
    createdAt: t.triggeredAt,
  };
}

function NotificationsScreen() {
  const { colors } = useTheme();
  const triggered = useAlertsStore((s) => s.triggered);
  const markTriggeredRead = useAlertsStore((s) => s.markTriggeredRead);
  const markAllTriggeredRead = useAlertsStore((s) => s.markAllTriggeredRead);

  const notifications = useMemo(
    () => triggered.map(triggeredToNotification),
    [triggered],
  );

  const unreadCount = triggered.filter((t) => !t.isRead).length;

  // Mark everything read when the user views the screen.
  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => markAllTriggeredRead(), 1500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, markAllTriggeredRead]);

  const handlePress = (notification: Notification) => {
    markTriggeredRead(notification.id);
    if (notification.cardId) {
      router.push(`/card/${notification.cardId}`);
    }
  };

  return (
    <ScreenBackground>
      <View
        style={{
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingTop: spacing[4],
          paddingBottom: spacing[3],
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text variant="headingLg">Notifications</Text>
        {triggered.length > 0 && (
          <Pressable
            onPress={() => useAlertsStore.getState().clearTriggered()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear all notifications"
          >
            <Text variant="labelMd" color={colors.primary}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={handlePress} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<IconBell size={40} color={colors.onSurfaceMuted} />}
            title="No notifications yet"
            description="Set a price alert on any card and we'll notify you when it hits your target."
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[24] }}
      />
    </ScreenBackground>
  );
}

export default withErrorBoundary(NotificationsScreen, 'Notifications');
