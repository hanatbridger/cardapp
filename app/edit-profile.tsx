import React, { useState } from 'react';
import { View, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
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
import { useUserStore } from '../src/stores';
import { useCollapsingHeader } from '../src/hooks';

function EditProfileScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile, authProvider } = useUserStore();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [username, setUsername] = useState(profile.username);
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
            <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[6] }}>
              <Button
                variant="outlined"
                onPress={() => router.push('/change-password')}
                fullWidth
              >
                Change Password
              </Button>
            </View>
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default withErrorBoundary(EditProfileScreen, 'Edit Profile');
