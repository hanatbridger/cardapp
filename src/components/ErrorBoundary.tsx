import React from 'react';
import { View, Text as RNText, Pressable } from 'react-native';
import { IconAlertTriangle } from '@tabler/icons-react-native';
import { spacing, radius, typography, darkColors } from '../theme/tokens';
import { captureException } from '../services/sentry';

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the fallback (e.g. "Card Detail"). */
  screenName?: string;
  /** Custom fallback renderer. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Called when an error is caught — hook for Sentry/analytics later. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', this.props.screenName ?? 'root', error, info);
    // Report to Sentry automatically for all ErrorBoundaries
    captureException(error, {
      screenName: this.props.screenName,
      componentStack: info.componentStack,
    });
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return <DefaultFallback error={error} onRetry={this.reset} screenName={this.props.screenName} />;
  }
}

/**
 * HOC that wraps a screen component in an ErrorBoundary so a crash in
 * that screen doesn't kill navigation. Use for top-level screen exports.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string,
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary screenName={screenName}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${screenName})`;
  return Wrapped;
}

function DefaultFallback({
  error,
  onRetry,
  screenName,
}: {
  error: Error;
  onRetry: () => void;
  screenName?: string;
}) {
  // Theme hook can't be used here — if ThemeProvider itself crashed, useTheme
  // would throw inside the fallback. Import raw dark tokens so fallback always
  // renders with consistent styling.
  const c = darkColors;
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[8],
        gap: spacing[4],
        backgroundColor: c.surface,
      }}
    >
      <IconAlertTriangle size={48} color={c.warning} />
      <RNText
        style={{
          ...typography.headingSm,
          textAlign: 'center',
          color: c.onSurface,
        }}
      >
        Something went wrong
      </RNText>
      <RNText
        style={{
          ...typography.bodySm,
          textAlign: 'center',
          color: c.onSurfaceVariant,
          maxWidth: 320,
        }}
      >
        {screenName ? `We hit an issue loading ${screenName}.` : 'We hit an unexpected issue.'}{' '}
        Try again — if it keeps happening, restart the app.
      </RNText>
      {__DEV__ && (
        <RNText
          style={{
            ...typography.caption,
            textAlign: 'center',
            color: c.onSurfaceMuted,
            maxWidth: 320,
          }}
        >
          {error.message}
        </RNText>
      )}
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={({ pressed }) => ({
          height: 40,
          paddingHorizontal: spacing[4],
          borderRadius: radius.lg,
          backgroundColor: pressed ? c.primaryActive : c.primary,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <RNText
          style={{ ...typography.labelLg, color: c.onPrimary }}
        >
          Try again
        </RNText>
      </Pressable>
    </View>
  );
}
