import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardAvoidingViewProps } from 'react-native';

/**
 * `behavior` + `enabled` for a KeyboardAvoidingView — spread them on.
 *
 * Android runs edge-to-edge (app.json), which sets decorFitsSystemWindows
 * false, so adjustResize no longer shrinks the root for the keyboard and
 * KAV has to pad, as it always did on iOS. Android's keyboardDidHide,
 * though, reports the visible frame's HEIGHT as screenY; under
 * edge-to-edge the root also spans the status and nav bars, so KAV would
 * keep that much padding after the keyboard closes. Enabling it only
 * while the keyboard is up drops the leftover. Web keeps no behavior.
 */
export function useKeyboardAvoidance(): Pick<KeyboardAvoidingViewProps, 'behavior' | 'enabled'> {
  const [shown, setShown] = useState(() => Platform.OS === 'android' && Keyboard.isVisible());

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === 'web') return { behavior: undefined };
  return { behavior: 'padding', enabled: Platform.OS !== 'android' || shown };
}
