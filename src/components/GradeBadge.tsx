import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { pillGeometry, pillTextStyle, pillTextVariant } from './Badge';
import { useTheme } from '../theme/ThemeProvider';
import { GRADES, type GradeType } from '../constants/grades';
import { withAlpha } from '../utils/withAlpha';

interface GradeBadgeProps {
  grade: GradeType;
}

export function GradeBadge({ grade }: GradeBadgeProps) {
  const { colors } = useTheme();
  const config = GRADES[grade as keyof typeof GRADES] ?? GRADES.UNGRADED;
  const color = colors[config.colorKey];

  return (
    <View style={{ ...pillGeometry, backgroundColor: withAlpha(color, 0.2) }}>
      <Text variant={pillTextVariant} color={color} style={pillTextStyle}>
        {config.label}
      </Text>
    </View>
  );
}
