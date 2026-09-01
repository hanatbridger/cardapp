import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * AsyncStorage with failure absorbed.
 *
 * Zustand's persist writes on every state change and does not catch
 * storage rejections, so on a device with a full disk every mutation
 * fired an unhandled rejection (Sentry: NSCocoaErrorDomain 640 /
 * POSIX 28 "No space left on device" from RCTAsyncLocalStorage).
 *
 * The device being full is the user's situation, not a crash of ours:
 * the correct behavior is to keep running on in-memory state and stop
 * persisting until space returns. Reads fall back to null (fresh
 * defaults) rather than throwing on a corrupt/unreadable entry.
 */
let noted = false;
function note(op: string, error: unknown) {
  if (noted) return;
  noted = true;
  console.warn(`[storage] ${op} failed; persistence degraded this session`, error);
}

export const safeStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch (e) {
      note('read', e);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (e) {
      note('write', e);
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      note('remove', e);
    }
  },
};
