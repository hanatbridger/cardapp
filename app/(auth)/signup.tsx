import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, Link } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, AuthForm, ScreenBackground, withErrorBoundary } from '../../src/components';
import { useUserStore } from '../../src/stores/user-store';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { safeGoBack } from '../../src/utils/safeGoBack';

function SignupScreen() {
  const { colors } = useTheme();
  const signIn = useUserStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (values: {
    email: string;
    password: string;
    displayName?: string;
  }) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const username = '@' + values.email.split('@')[0];
    signIn({
      email: values.email,
      username,
      displayName: values.displayName || username.slice(1),
    }, 'email');
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

      const firstName = credential.fullName?.givenName ?? '';
      const lastName = credential.fullName?.familyName ?? '';
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Apple User';
      const email = credential.email ?? 'apple-user@privaterelay.appleid.com';
      const username = '@' + displayName.toLowerCase().replace(/\s+/g, '');

      signIn({ email, username, displayName }, 'apple');
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign Up Failed', 'Apple Sign In could not be completed. Please try again.');
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
            paddingTop: spacing[4],
            paddingBottom: spacing[6],
            gap: spacing[6],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Pressable
            onPress={() => safeGoBack('/(auth)/login')}
            hitSlop={8}
            style={{ padding: spacing[1], alignSelf: 'flex-start' }}
          >
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>

          {/* Header */}
          <View style={{ gap: spacing[2] }}>
            <Text variant="displaySm">Create your account</Text>
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              Track prices, build watchlists, and never miss a market move.
            </Text>
          </View>

          {/* Form */}
          <AuthForm mode="signup" onSubmit={handleSignUp} onApple={handleApple} loading={loading} />

          {/* Legal */}
          <Text
            variant="caption"
            color={colors.onSurfaceMuted}
            style={{ textAlign: 'center' }}
          >
            By creating an account, you agree to our Terms of Use and Privacy Policy.
          </Text>

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
              Already have an account?
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={8}>
                <Text variant="bodySm" color={colors.primary}>
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

export default withErrorBoundary(SignupScreen, 'Signup');
