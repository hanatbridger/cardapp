import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { FLOATING_TAB_BAR_HEIGHT, FLOATING_TAB_BAR_OFFSET } from '../constants/layout';

/**
 * Bottom scroll padding for tab screens: the floating bar's real
 * footprint (surface + float offset + safe-area inset) plus breathing
 * room, so the last row scrolls fully clear of the bar. A fixed 96 was
 * 10pt short on home-indicator iPhones and ~24dp short on 3-button
 * Android navigation.
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_OFFSET + insets.bottom + spacing[6];
}
