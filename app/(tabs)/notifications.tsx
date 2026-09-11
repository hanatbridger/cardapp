import React, { useCallback, useMemo } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { IconBell } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, NotificationItem, EmptyState, ScreenBackground, withErrorBoundary } from '../../src/components';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useAlertsStore } from '../../src/stores/alerts-store';
import { CONDITION_LABELS, formatSignedUsd } from '../../src/services/grading-verdict';
import { formatReturnAlertMessage } from '../../src/services/since-added';
import { maybeRequestReview } from '../../src/utils/review-prompt';
import type { Notification } from '../../src/types/social';
import type { TriggeredAlert } from '../../src/stores/alerts-store';

function triggeredToNotification(t: TriggeredAlert): Notification {
  if (t.kind === 'return') {
    // Same copy as the push, so the feed row reads like the banner did.
    const { title, body } = formatReturnAlertMessage(t.cardName, t.direction, t.pct, t.currentPrice);
    return {
      id: t.id,
      type: t.direction === 'up' ? 'return_up' : 'return_down',
      title,
      message: body,
      cardId: t.cardId,
      productId: t.productId,
      isRead: t.isRead,
      createdAt: t.triggeredAt,
    };
  }
  if (t.kind === 'grading') {
    const verdict =
      t.direction === 'above' ? 'is worth grading now' : 'is no longer worth grading';
    return {
      id: t.id,
      type: 'grading_alert',
      title: 'Grading Alert',
      message: `${t.cardName} at ${CONDITION_LABELS[t.condition]} ${verdict} — expected ${formatSignedUsd(t.expectedNet)} after fees (grade ${t.letter}).`,
      cardId: t.cardId,
      isRead: t.isRead,
      createdAt: t.triggeredAt,
    };
  }
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

  // Mark everything read when the user views the screen — focus-scoped:
  // expo-router keeps this tab mounted, so a plain effect fired while the
  // user was on a DIFFERENT tab, silently clearing the unread dot for an
  // alert they never saw.
  useFocusEffect(
    useCallback(() => {
      if (unreadCount === 0) return;
      const timer = setTimeout(() => markAllTriggeredRead(), 1500);
      return () => clearTimeout(timer);
    }, [unreadCount, markAllTriggeredRead]),
  );

  // A price alert the user set has fired and they came to look at it —
  // the one moment in this app where something demonstrably went right
  // for them, and the only kind iOS's three-per-year cap is worth
  // spending on. Eligibility (launch count, cooldown, one prompt per
  // version) is decided inside maybeRequestReview. Delayed so it lands
  // after the list has painted rather than on top of it — and focus-
  // scoped so the prompt can't pop over some other tab.
  useFocusEffect(
    useCallback(() => {
      if (triggered.length === 0) return;
      const timer = setTimeout(() => {
        maybeRequestReview();
      }, 2500);
      return () => clearTimeout(timer);
    }, [triggered.length]),
  );

  const handlePress = (notification: Notification) => {
    markTriggeredRead(notification.id);
    if (notification.cardId) {
      router.push(`/card/${notification.cardId}`);
    } else if (notification.productId) {
      router.push(`/sealed/${notification.productId}`);
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
            description="Set a price or grading alert on any card and we'll notify you when it crosses your line."
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[24] }}
      />
    </ScreenBackground>
  );
}

export default withErrorBoundary(NotificationsScreen, 'Notifications');
