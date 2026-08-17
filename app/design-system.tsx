import React from 'react';
import { Redirect } from 'expo-router';

// Metro inlines __DEV__ as false in release bundles and dead-code
// eliminates this require, so the ~40KB editor module (and its
// TokenEditorPanel subtree) never ships to production. Keep this a
// require — a top-level import would defeat the elimination.
const Screen: React.ComponentType | null = __DEV__
  ? require('../src/dev/design-system-screen').default
  : null;

export default function DesignSystemRoute() {
  if (!Screen) {
    return <Redirect href="/" />;
  }
  return <Screen />;
}
