import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, AuthForm, ScreenBackground, BrandMark, withErrorBoundary } from '../../src/components';
import { useUserStore } from '../../src/stores/user-store';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';

function LoginScreen() {
  const { colors } = useTheme();
  const signIn = useUserStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (values: { email: string; password: string }) => {
    setLoading(true);
    // Simulate network call. Real auth wiring lives behind a proper backend
    // and is intentionally stubbed for the App Store launch MVP.
    await new Promise((r) => setTimeout(r, 400));
    const username = '@' + values.email.split('@')[0];
    signIn({ email: values.email, username, displayName: username.slice(1) }, 'email');
    setLoading(false);
    router.replace('/(tabs)');
  };

  const handleApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Apple only returns name/email on first sign-in; fall back to defaults
      const firstName = credential.fullName?.givenName ?? '';
      const lastName = credential.fullName?.familyName ?? '';
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Apple User';
      const email = credential.email ?? 'apple-user@privaterelay.appleid.com';
      const username = '@' + displayName.toLowerCase().replace(/\s+/g, '');

      signIn({ email, username, displayName }, 'apple');
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Failed', 'Apple Sign In could not be completed. Please try again.');
      }
    }
  };

  return (
    <ScreenBackground edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[8],
            paddingBottom: spacing[6],
            gap: spacing[8],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ gap: spacing[4] }}>
            <BrandMark size={56} />
            <View style={{ gap: spacing[2] }}>
              <Text variant="displaySm">Welcome back</Text>
              <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                Sign in to keep tracking your collection.
              </Text>
            </View>
          </View>

          {/* Form */}
          <AuthForm mode="signin" onSubmit={handleSignIn} onApple={handleApple} loading={loading} />

          {/* Footer */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing[1],
              marginTop: 'auto',
            }}
          >
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              Don't have an account?
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable hitSlop={8}>
                <Text variant="bodySm" color={colors.primary}>
                  Sign up
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

export default withErrorBoundary(LoginScreen, 'Login');
