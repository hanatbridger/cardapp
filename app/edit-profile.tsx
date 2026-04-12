import React, { useState } from 'react';
import { View, ScrollView, Pressable, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconChevronLeft, IconCamera } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Input, Button, Avatar, withErrorBoundary } from '../src/components';
import { spacing, radius } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { useUserStore } from '../src/stores';

function EditProfileScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserStore();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [username, setUsername] = useState(profile.username);

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
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[4],
            paddingBottom: spacing[2],
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: spacing[1] }}>
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Text variant="headingSm">Edit Profile</Text>
          <Button variant="ghost" size="sm" onPress={handleSave}>
            Save
          </Button>
        </View>

        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: spacing[5], gap: spacing[2] }}>
          <View>
            <Avatar name={displayName} size={80} />
            <Pressable
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: radius.full,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCamera size={14} color={colors.onPrimary} />
            </Pressable>
          </View>
          <Text variant="caption" color={colors.primary}>Change Photo</Text>
        </View>

        {/* Form */}
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
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default withErrorBoundary(EditProfileScreen, 'Edit Profile');
