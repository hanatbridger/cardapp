import React, { useEffect, useId, useLayoutEffect, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Minimal portal: `<Portal>` teleports its children to the `<PortalHost>`
 * mounted at the root layout, above the navigator and the tab bar.
 *
 * Overlays render here instead of inside RN's `Modal`. `Modal` presents a
 * native view controller, and on Fabric that presentation is asynchronous
 * and slow — a sheet that starts its own slide animation the moment
 * `visible` flips appears whenever iOS gets around to presenting it,
 * already mid-slide or fully landed. A portal is a plain view in the
 * existing hierarchy: it is on screen in the same commit, so the entry
 * animation is seen from its first frame.
 *
 * Context: the host sits inside ThemeProvider, QueryClientProvider and
 * expo-router's SafeAreaProvider, so portal content keeps those. It is
 * outside the navigator, so navigation hooks (useNavigation, useFocusEffect)
 * are unavailable in portal content — the imperative `router` still works.
 */

interface Entry {
  key: string;
  node: React.ReactNode;
}

let entries: Entry[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setEntry(key: string, node: React.ReactNode) {
  const index = entries.findIndex((e) => e.key === key);
  entries =
    index === -1
      ? [...entries, { key, node }]
      : entries.map((e, i) => (i === index ? { key, node } : e));
  emit();
}

function removeEntry(key: string) {
  if (!entries.some((e) => e.key === key)) return;
  entries = entries.filter((e) => e.key !== key);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return entries;
}

export function Portal({ children }: { children: React.ReactNode }) {
  const key = useId();
  // Layout effect so the host re-renders in the same commit — the overlay
  // is on screen before the frame paints, not one frame later.
  useLayoutEffect(() => {
    setEntry(key, children);
  }, [key, children]);
  useEffect(() => () => removeEntry(key), [key]);
  return null;
}

/** Mount once, after the navigator, so overlays stack above every screen. */
export function PortalHost() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (snapshot.length === 0) return null;
  return (
    // box-none: an empty host must never eat touches meant for the app.
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {snapshot.map((e) => (
        <React.Fragment key={e.key}>{e.node}</React.Fragment>
      ))}
    </View>
  );
}
