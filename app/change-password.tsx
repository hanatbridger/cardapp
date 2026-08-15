import React, { useState } from 'react';
import { View, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  Input,
  Button,
  CollapsingHeader,
  withErrorBoundary,
} from '../src/components';
import { spacing } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { safeGoBack } from '../src/utils/safeGoBack';
import { useCollapsingHeader } from '../src/hooks';
import { supabase } from '../src/services/supabase';

function ChangePasswordScreen() {
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();

  const handleUpdate = async () => {
    setError('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // updateUser alone would accept ANY value in the current-password
      // field (Supabase has no reauthentication check on that call), so
      // verify it for real by re-signing-in first. This also covers a
      // hijacked open session: without the current password you can't
      // rotate it to lock the owner out.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (userErr || !email) {
        setError('Session expired. Sign in again and retry.');
        return;
      }
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthErr) {
        setError('Current password is incorrect');
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) {
        setError(updateErr.message || 'Could not update password. Please try again.');
        return;
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not update password. Please try again.');
      return;
    } finally {
      setLoading(false);
    }

    const msg = 'Password updated successfully.';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Success', msg);
    }
    safeGoBack('/edit-profile');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <CollapsingHeader
        title="Change Password"
        backFallback="/edit-profile"
        animatedStyle={headerAnimatedStyle}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: spacing[12],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ height: spacing[4] }} />
          <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[4] }}>
            <Input
              label="Current Password"
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setError(''); }}
              secureTextEntry
            />
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setError(''); }}
              secureTextEntry
              hint="At least 6 characters"
            />
            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
              secureTextEntry
              error={error || undefined}
            />
            <View style={{ height: spacing[2] }} />
            <Button
              variant="filled"
              onPress={handleUpdate}
              fullWidth
              loading={loading}
            >
              Update Password
            </Button>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default withErrorBoundary(ChangePasswordScreen, 'Change Password');
