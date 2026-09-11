import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { IconCrown } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

interface WatchlistFullModalProps {
  visible: boolean;
  onClose: () => void;
  currentCount: number;
  maxCount: number;
}

/**
 * Free-tier watchlist cap upsell. A headerless sheet (no title row) so the
 * crown and heading stay centred; the handle, backdrop and "Maybe later"
 * all dismiss.
 */
export function WatchlistFullModal({ visible, onClose, currentCount, maxCount }: WatchlistFullModalProps) {
  const { colors } = useTheme();
  const fillPct = Math.min(100, (currentCount / Math.max(1, maxCount)) * 100);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', gap: spacing[4] }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.full,
            backgroundColor: withAlpha(colors.primary, 0.15),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconCrown size={32} color={colors.primary} />
        </View>

        <Text variant="headingMd" style={{ textAlign: 'center' }}>
          Watchlist full
        </Text>

        <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
          You're tracking {currentCount}/{maxCount} cards. Upgrade to Premium for an unlimited watchlist, price alerts, and AI insights.
        </Text>

        <View style={{ width: '100%', gap: spacing[1] }}>
          <View
            style={{
              height: 6,
              borderRadius: radius.full,
              backgroundColor: colors.outline,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${fillPct}%`,
                backgroundColor: colors.primary,
                borderRadius: radius.full,
              }}
            />
          </View>
          <Text variant="caption" color={colors.onSurfaceMuted} style={{ textAlign: 'right' }}>
            {currentCount}/{maxCount} cards
          </Text>
        </View>

        <Button variant="filled" fullWidth size="lg" onPress={() => { onClose(); router.push('/paywall'); }}>
          Upgrade to Premium
        </Button>

        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
          style={({ pressed }) => ({
            paddingVertical: spacing[2],
            paddingHorizontal: spacing[3],
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text variant="labelMd" color={colors.onSurfaceMuted}>
            Maybe later
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
