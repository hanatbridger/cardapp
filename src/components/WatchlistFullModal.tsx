import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { IconCrown, IconX } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

interface WatchlistFullModalProps {
  visible: boolean;
  onClose: () => void;
  currentCount: number;
  maxCount: number;
}

export function WatchlistFullModal({ visible, onClose, currentCount, maxCount }: WatchlistFullModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: withAlpha(colors.onSurface, 0.6),
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[5],
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius['2xl'],
            padding: spacing[6],
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
            gap: spacing[4],
            ...shadows.xl,
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={{ position: 'absolute', top: spacing[3], right: spacing[3] }}
          >
            <IconX size={20} color={colors.onSurfaceMuted} />
          </Pressable>

          {/* Crown icon */}
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

          {/* Title */}
          <Text variant="headingMd" style={{ textAlign: 'center' }}>
            Watchlist Full
          </Text>

          {/* Description */}
          <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
            You're tracking {currentCount}/{maxCount} cards. Upgrade to Premium for unlimited watchlist, price alerts, and AI insights.
          </Text>

          {/* Progress bar */}
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
                  width: `${(currentCount / maxCount) * 100}%`,
                  backgroundColor: colors.primary,
                  borderRadius: radius.full,
                }}
              />
            </View>
            <Text variant="caption" color={colors.onSurfaceMuted} style={{ textAlign: 'right' }}>
              {currentCount}/{maxCount} cards
            </Text>
          </View>

          {/* CTA */}
          <Button variant="filled" fullWidth size="lg" onPress={() => { onClose(); router.push('/paywall'); }}>
            Upgrade to Premium
          </Button>

          <Pressable onPress={onClose}>
            <Text variant="labelMd" color={colors.onSurfaceMuted}>
              Maybe later
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
