import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components';
import { useDebugEvents } from './debug-events';

/**
 * On-screen HUD that prints the last N touch/gesture events.
 * Mounted at the top of the home screen during the v1.0.4
 * diagnostic build only. Pressing the HUD clears its log so the
 * user can isolate a single tap attempt.
 *
 * Format:
 *   HH:MM:SS.ms  source: event  [detail]
 *
 * The HUD itself uses `pointerEvents: 'box-none'` on its outer
 * View so it doesn't intercept taps on the home content below.
 * Only the inner Pressable (the "tap to clear" affordance) accepts
 * touches.
 */
export function TouchDebugHUD() {
  const events = useDebugEvents((s) => s.events);
  const clear = useDebugEvents((s) => s.clear);

  const fmt = (e: { ts: number; source: string; type: string; detail?: string }) => {
    const d = new Date(e.ts);
    const ms = String(e.ts % 1000).padStart(3, '0');
    const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${ms}`;
    return `${time}  ${e.source}: ${e.type}${e.detail ? '  ' + e.detail : ''}`;
  };

  return (
    <View
      // box-none so the wrapper doesn't capture taps meant for
      // content underneath. The inner Pressable handles its own.
      style={{
        position: 'absolute',
        top: 60,
        left: 10,
        right: 10,
        zIndex: 9999,
        pointerEvents: 'box-none',
      }}
    >
      <Pressable
        onPress={clear}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          padding: 8,
          borderRadius: 6,
        }}
      >
        <Text
          variant="caption"
          color="#9ca3af"
          style={{ fontFamily: 'Menlo', fontSize: 9, marginBottom: 4 }}
        >
          TOUCH DEBUG ({events.length}/30) — tap to clear
        </Text>
        {events.length === 0 ? (
          <Text
            variant="caption"
            color="#9ca3af"
            style={{ fontFamily: 'Menlo', fontSize: 9, fontStyle: 'italic' }}
          >
            no events yet — cold-launch, then tap a watchlist row
          </Text>
        ) : (
          events.slice(-12).map((e, i) => (
            <Text
              key={`${e.ts}-${i}`}
              variant="caption"
              color="#fff"
              style={{ fontFamily: 'Menlo', fontSize: 9 }}
              numberOfLines={1}
            >
              {fmt(e)}
            </Text>
          ))
        )}
      </Pressable>
    </View>
  );
}
