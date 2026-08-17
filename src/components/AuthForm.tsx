import React, { useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { IconBrandApple, IconMail, IconLock, IconUser } from '@tabler/icons-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { Input } from './Input';
import { Button } from './Button';
import { GoogleGLogo } from './GoogleGLogo';
import { spacing, radius } from '../theme/tokens';

export type AuthMode = 'signin' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (values: { email: string; password: string; displayName?: string }) => void;
  onApple: () => void;
  /** Google sign-in handler. When provided, a "Continue with Google"
   *  button renders below the Apple button. */
  onGoogle?: () => void;
  loading?: boolean;
  /**
   * When true, hide the email/password form entirely and surface only
   * the social sign-in buttons (Apple + Google). Used for the v1
   * launch where email/password isn't wired — shipping a stubbed
   * email/password flow risks an App Review rejection for placeholder
   * content.
   */
  appleOnly?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared form for sign in / sign up. Validates inputs locally and
 * delegates submission to the parent. Includes Apple Sign In button —
 * required by App Store guidelines when offering other social login,
 * but also a nice fast path even with email/password.
 */
export function AuthForm({ mode, onSubmit, onApple, onGoogle, loading, appleOnly }: AuthFormProps) {
  const { colors, isDark } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

  const verb = mode === 'signin' ? 'Sign in' : 'Sign up';

  // Google button — white surface, neutral border, official multicolor
  // "G" mark (GoogleGLogo) per Google's Sign-In branding guidelines.
  const GoogleButton = onGoogle ? (
    <Pressable
      onPress={onGoogle}
      style={({ pressed }) => ({
        height: 48,
        borderRadius: radius.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DADCE0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        opacity: pressed ? 0.85 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={`${verb} with Google`}
    >
      <GoogleGLogo size={18} />
      <Text variant="labelLg" color="#1F1F1F">
        {Platform.OS === 'ios' || Platform.OS === 'web'
          ? `${verb} with Google`
          : 'Continue with Google'}
      </Text>
    </Pressable>
  ) : null;

  const submit = () => {
    const next: typeof errors = {};
    if (mode === 'signup' && displayName.trim().length < 2) {
      next.displayName = 'Please enter your name';
    }
    if (!EMAIL_RE.test(email)) {
      next.email = 'Enter a valid email';
    }
    if (password.length < 6) {
      next.password = 'At least 6 characters';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({ email: email.trim(), password, displayName: displayName.trim() || undefined });
  };

  // Apple HIG: white-on-black on light themes, black-on-white on dark themes
  const appleBg = isDark ? '#FFFFFF' : '#000000';
  const appleFg = isDark ? '#000000' : '#FFFFFF';

  // v1 launch path — Apple Sign In only. Skips the email/password
  // fields and the "or" divider, keeping just the system-styled Apple
  // button. AuthForm internals stay intact for the post-launch flow
  // when Supabase auth is wired and email/password becomes real.
  if (appleOnly) {
    return (
      <View style={{ gap: spacing[3] }}>
        {GoogleButton}
        <Pressable
          onPress={onApple}
          style={({ pressed }) => ({
            height: 48,
            borderRadius: radius.lg,
            backgroundColor: appleBg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            opacity: pressed ? 0.85 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={`${verb} with Apple`}
        >
          <IconBrandApple size={20} color={appleFg} />
          <Text variant="labelLg" color={appleFg}>
            {Platform.OS === 'ios' || Platform.OS === 'web'
              ? `${verb} with Apple`
              : `Continue with Apple`}
          </Text>
        </Pressable>
        <Text
          variant="caption"
          color={colors.onSurfaceMuted}
          style={{ textAlign: 'center', lineHeight: 16, marginTop: spacing[1] }}
        >
          Your watchlist saves locally on this device.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing[4] }}>
      {mode === 'signup' && (
        <Input
          label="Name"
          placeholder="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          icon={<IconUser size={18} color={colors.onSurfaceMuted} />}
          error={errors.displayName}
        />
      )}
      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        icon={<IconMail size={18} color={colors.onSurfaceMuted} />}
        error={errors.email}
      />
      <Input
        label="Password"
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        textContentType={mode === 'signin' ? 'password' : 'newPassword'}
        icon={<IconLock size={18} color={colors.onSurfaceMuted} />}
        error={errors.password}
      />

      <Button onPress={submit} fullWidth size="lg" loading={loading}>
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </Button>

      {/* Divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.outlineVariant }} />
        <Text variant="caption" color={colors.onSurfaceMuted}>
          or
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.outlineVariant }} />
      </View>

      {/* Google Sign In */}
      {GoogleButton}

      {/* Apple Sign In */}
      <Pressable
        onPress={onApple}
        style={({ pressed }) => ({
          height: 48,
          borderRadius: radius.lg,
          backgroundColor: appleBg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[2],
          opacity: pressed ? 0.85 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={`${verb} with Apple`}
      >
        <IconBrandApple size={20} color={appleFg} />
        <Text variant="labelLg" color={appleFg}>
          {Platform.OS === 'ios' || Platform.OS === 'web'
            ? `${verb} with Apple`
            : `Continue with Apple`}
        </Text>
      </Pressable>
    </View>
  );
}
