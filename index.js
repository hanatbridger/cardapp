// App entry (package.json "main"). expo-router evaluates a route module
// only when it renders that route, and an OS wake for the background alert
// task (expo-task-manager's headless start on Android) renders nothing, so
// anything set up in app/_layout.tsx never runs in that runtime. The task
// executor and the notification handler + Android channels it posts
// through are therefore defined here, at bundle evaluation, on every start.
// Both calls are no-ops on web.
import { defineBackgroundAlertTask } from './src/services/background-alerts';
import { configureNotificationHandler } from './src/services/notifications';

defineBackgroundAlertTask();
configureNotificationHandler();

// require, not import: an import would be hoisted above the two calls.
require('expo-router/entry');
