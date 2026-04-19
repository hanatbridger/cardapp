import React, { useState } from 'react';
import { View, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  Text,
  Input,
  Button,
  CollapsingHeader,
  withErrorBoundary,
} from '../src/components';
import { spacing } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { safeGoBack } from '../src/utils/safeGoBack';
import { useUserStore } from '../src/stores';
import { useCollapsingHeader } from '../src/hooks';

function EditProfileScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile, authProvider } = useUserStore();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [username, setUsername] = useState(profile.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();

  const handleSave = () => {
    if (!displayName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Display name is required');
      } else {
        Alert.alert('Error', 'Display name is required');
      }
      return;
    }
    updateProfile({ displayName: displayName.trim(), email: email.trim(), username: username.trim() });
    safeGoBack('/(tabs)/profile');
  };

  const handleChangePassword = () => {
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    // In production this would call the backend to verify current password
    // and update to the new one. Stubbed for MVP.
    const msg = 'Password updated successfully.';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Success', msg);
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <CollapsingHeader
        title="Edit Profile"
        backFallback="/(tabs)/profile"
        animatedStyle={headerAnimatedStyle}
        right={
          <Button variant="ghost" size="sm" onPress={handleSave}>
            Save
          </Button>
        }
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
          {/* Form */}
          <View style={{ height: spacing[4] }} />
          <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[4] }}>
            <Input
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Change Password — only for email auth users */}
          {authProvider === 'email' && (
            <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[4], paddingTop: spacing[6] }}>
              <View style={{ height: 1, backgroundColor: colors.outline }} />
              <Text variant="labelLg" color={colors.onSurfaceVariant}>
                Change Password
              </Text>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={(t) => { setCurrentPassword(t); setPasswordError(''); }}
                secureTextEntry
              />
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setPasswordError(''); }}
                secureTextEntry
                hint="At least 6 characters"
              />
              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setPasswordError(''); }}
                secureTextEntry
                error={passwordError || undefined}
              />
              <Button
                variant="outlined"
                onPress={handleChangePassword}
                fullWidth
              >
                Update Password
              </Button>
            </View>
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default withErrorBoundary(EditProfileScreen, 'Edit Profile');
