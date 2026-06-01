import React from 'react';
import { Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';

interface TouchableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
  accessibilityState?: { selected?: boolean; disabled?: boolean };
  accessibilityHint?: string;
  disabled?: boolean;
  hitSlop?: number;
}

/**
 * Cross-platform tap target — the single source of truth for "which
 * touchable do we use where".
 *
 *   native (iOS/Android) → gesture-handler's RectButton. RN's
 *     Pressable intermittently drops presses on Fabric / the new
 *     architecture (the watchlist-tap + search-button bugs), while
 *     gesture-handler's buttons fire reliably.
 *
 *   web → RN Pressable. On react-native-web RectButton doesn't
 *     reliably fire onClick, and even when it does, window.open from
 *     its handler loses the trusted user-gesture context and gets
 *     popup-blocked. Pressable maps to a real onClick, so presses
 *     fire and link-outs are allowed.
 *
 * Keeping the choice in one place stops the two platforms from
 * drifting apart as new tap targets get added.
 */
export function Touchable({ style, ...rest }: TouchableProps) {
  if (Platform.OS === 'web') {
    return <Pressable style={style as any} {...rest} />;
  }
  return <RectButton style={style as any} {...rest} />;
}
