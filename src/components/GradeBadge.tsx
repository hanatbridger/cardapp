import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { GRADES, type GradeType } from '../constants/grades';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

interface GradeBadgeProps {
  grade: GradeType;
  size?: 'sm' | 'md';
}

export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const { colors } = useTheme();
  const config = GRADES[grade as keyof typeof GRADES] ?? GRADES.UNGRADED;
  const color = colors[config.colorKey];

  return (
    <View
      style={{
        backgroundColor: withAlpha(color, 0.2),
        borderRadius: radius.full,
        paddingHorizontal: size === 'sm' ? spacing[1] : spacing[2],
        paddingVertical: size === 'sm' ? spacing['0.5'] : spacing[1],
        alignSelf: 'flex-start',
      }}
    >
      <Text
        variant={size === 'sm' ? 'labelSm' : 'labelMd'}
        color={color}
      >
        {config.label}
      </Text>
    </View>
  );
}
