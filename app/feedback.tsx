import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import Animated from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { IconPhoto, IconX, IconCircleCheck } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  Text,
  Input,
  Button,
  SegmentedControl,
  CollapsingHeader,
  withErrorBoundary,
} from '../src/components';
import { spacing, radius } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { safeGoBack } from '../src/utils/safeGoBack';
import { useCollapsingHeader } from '../src/hooks';
import { useUserStore } from '../src/stores';
import { submitFeedback, type FeedbackKind } from '../src/services/feedback';

const KINDS: Array<{ key: FeedbackKind; label: string }> = [
  { key: 'bug', label: 'Bug' },
  { key: 'idea', label: 'Idea' },
  { key: 'general', label: 'General' },
];

function FeedbackScreen() {
  const { colors } = useTheme();
  const profile = useUserStore((s) => s.profile);
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();

  const [kindIndex, setKindIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear the auto-dismiss timer on unmount — otherwise it fires after
  // the user has already navigated away and pops whatever screen is
  // on top at that moment.
  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  // Web: paste a screenshot straight into the composer.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPaste = (e: any) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i: any) =>
        i.type?.startsWith('image/'),
      );
      const file = item?.getAsFile?.();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setShot(String(reader.result));
      reader.readAsDataURL(file);
    };
    (globalThis as any).document?.addEventListener('paste', onPaste);
    return () => (globalThis as any).document?.removeEventListener('paste', onPaste);
  }, []);

  const attach = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    const uri = res.assets?.[0]?.uri;
    if (uri) {
      setShot(uri);
      setError('');
    }
  };

  const send = async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError('');
    const res = await submitFeedback({
      kind: KINDS[kindIndex].key,
      message: message.trim(),
      screenshot: shot,
      username: profile.username || profile.displayName || profile.email,
    });
    setBusy(false);
    if (res.ok) {
      setSent(true);
      dismissTimer.current = setTimeout(() => safeGoBack('/profile'), 1400);
    } else {
      setError(res.error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <CollapsingHeader
        title="Send Feedback"
        backFallback="/profile"
        animatedStyle={headerAnimatedStyle}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: spacing[12] }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ height: spacing[4] }} />
          {sent ? (
            <View style={{ alignItems: 'center', gap: spacing[3], paddingTop: spacing[10] }}>
              <IconCircleCheck size={44} color={colors.success} />
              <Text variant="headingSm">Thanks — got it.</Text>
              <Text variant="bodySm" color={colors.onSurfaceVariant}>
                We read every one of these.
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[4] }}>
              <SegmentedControl
                options={KINDS.map((k) => k.label)}
                selected={kindIndex}
                onSelect={setKindIndex}
              />
              <Input
                label="What's going on?"
                value={message}
                onChangeText={(t) => {
                  setMessage(t);
                  setError('');
                }}
                multiline
                numberOfLines={6}
                style={{ minHeight: 140, textAlignVertical: 'top' }}
                placeholder={
                  kindIndex === 0
                    ? 'What broke, and what did you expect to happen?'
                    : 'Tell us everything.'
                }
                error={error || undefined}
              />
              {shot ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <Image
                    source={{ uri: shot }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceVariant,
                    }}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setShot(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove screenshot"
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}
                  >
                    <IconX size={16} color={colors.onSurfaceVariant} />
                    <Text variant="labelMd" color={colors.onSurfaceVariant}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Button variant="outlined" fullWidth icon={<IconPhoto size={18} color={colors.primary} />} onPress={attach}>
                  Attach screenshot
                </Button>
              )}
              <Button
                variant="filled"
                fullWidth
                loading={busy}
                disabled={!message.trim()}
                onPress={send}
              >
                Send Feedback
              </Button>
            </View>
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default withErrorBoundary(FeedbackScreen, 'Feedback');
