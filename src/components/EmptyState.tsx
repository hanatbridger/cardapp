import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', padding: spacing[8], gap: spacing[3] }}>
      {icon}
      <Text variant="headingSm" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text
          variant="bodySm"
          color={colors.onSurfaceVariant}
          style={{ textAlign: 'center', maxWidth: 280 }}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="filled" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
