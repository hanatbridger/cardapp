import React from 'react';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { formatBaselineDate, formatSignedPct } from '../services/since-added';

interface SinceAddedLabelProps {
  /** Percent return from the since-added baseline. */
  pct: number;
  /** Baseline date; omitted for list-level aggregates. */
  baselineAt?: string;
  /** Leading word, e.g. "Avg" for the watchlist aggregate. */
  prefix?: string;
}

/**
 * "+18.4% since Mar 15" — the Premium since-added return, shared by the
 * card row, the sealed row and the watchlist aggregate so all three read
 * and colour identically. Colour follows the rounded figure actually
 * printed, so a "+0.0%" never shows green.
 */
export function SinceAddedLabel({ pct, baselineAt, prefix }: SinceAddedLabelProps) {
  const { colors } = useTheme();
  const shown = Math.round(pct * 10) / 10;
  const color = shown > 0 ? colors.success : shown < 0 ? colors.danger : colors.onSurfaceMuted;
  const date = baselineAt ? formatBaselineDate(baselineAt) : '';
  const tail = date ? `since ${date}` : 'since added';
  const spoken = `${prefix ? `${prefix} ` : ''}${shown > 0 ? 'up' : shown < 0 ? 'down' : 'flat'} ${Math.abs(shown).toFixed(1)} percent ${tail}`;

  return (
    <Text
      variant="caption"
      color={color}
      numberOfLines={1}
      accessibilityLabel={spoken}
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {prefix ? `${prefix} ` : ''}
      {formatSignedPct(shown)} {tail}
    </Text>
  );
}
