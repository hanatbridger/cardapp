import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import { useThemeOverrideStore, type ColorOverrides } from '../stores/theme-override-store';
import { spacing, radius, lightColors, darkColors, type ColorTokens } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

/**
 * Dev-only live token editor mounted on the right side of
 * `app/design-system.tsx` at ≥1024px. Stages color edits locally, then
 * pushes them to `useThemeOverrideStore` on Apply — which ThemeProvider
 * merges on top of the baked-in palette so every screen in the app
 * (tabs, home, detail) re-renders with the new colors live.
 *
 * Changes are session-only by design. To ship a tweak to production,
 * use "Copy as TS" and paste into `src/theme/tokens.ts`. This avoids
 * divergence between the editor's ad-hoc state and source-of-truth
 * tokens committed to git.
 */

// Grouped for ergonomics — the editor panel is too dense to show 30
// flat keys without a hierarchy. Groups mirror how designers think
// about semantic colors (brand → surfaces → text → states).
const GROUPS: { title: string; keys: (keyof ColorTokens)[] }[] = [
  {
    title: 'Brand',
    keys: ['primary', 'primaryHover', 'primaryActive', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'indigoLift'],
  },
  {
    title: 'Surfaces',
    keys: ['surface', 'surfaceVariant', 'surfaceElevated'],
  },
  {
    title: 'Text',
    keys: ['onSurface', 'onSurfaceVariant', 'onSurfaceMuted'],
  },
  {
    title: 'Lines',
    keys: ['outline', 'outlineVariant', 'outlineStrong', 'skeleton'],
  },
  {
    title: 'States',
    keys: ['success', 'warning', 'danger', 'info'],
  },
  {
    title: 'State containers',
    keys: [
      'successContainer', 'onSuccessContainer',
      'warningContainer', 'onWarningContainer',
      'dangerContainer', 'onDangerContainer',
      'infoContainer', 'onInfoContainer',
    ],
  },
];

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function sanitize(value: string): string | null {
  const trimmed = value.trim();
  // Accept bare 6-char hex too ("4B5EFC") — pre-pend the '#'.
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_RE.test(withHash) ? withHash.toUpperCase() : null;
}

/**
 * RN Web doesn't expose `<input type="color">` — drop to the DOM via
 * React.createElement. On native this never renders (the whole panel
 * is gated by width >= 1024 anyway, which is desktop-web-only in
 * practice).
 */
function ColorWell({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { colors } = useTheme();
  if (Platform.OS !== 'web') {
    // Native fallback — just a swatch, no picker. Users edit the hex
    // text input next to it instead.
    return (
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.sm,
          backgroundColor: value,
          borderWidth: 1,
          borderColor: colors.outline,
        }}
      />
    );
  }
  return React.createElement('input', {
    type: 'color',
    // strip the alpha channel if present — <input type="color"> only
    // understands 6-char hex
    value: value.length === 9 ? value.slice(0, 7) : value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value.toUpperCase()),
    style: {
      width: 28,
      height: 28,
      padding: 0,
      border: `1px solid ${colors.outline}`,
      borderRadius: 6,
      background: 'transparent',
      cursor: 'pointer',
    },
  });
}

function TokenRow({
  tokenKey,
  draftValue,
  baseValue,
  onDraftChange,
}: {
  tokenKey: keyof ColorTokens;
  draftValue: string;
  baseValue: string;
  onDraftChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const isValid = sanitize(draftValue) !== null;
  const isDirty = draftValue.toUpperCase() !== baseValue.toUpperCase();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] }}>
      <ColorWell
        value={isValid ? sanitize(draftValue)! : baseValue}
        onChange={(hex) => onDraftChange(hex)}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="labelSm" numberOfLines={1} color={colors.onSurface}>
          {tokenKey}
        </Text>
      </View>
      <TextInput
        value={draftValue}
        onChangeText={onDraftChange}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        style={{
          width: 96,
          paddingVertical: spacing[1],
          paddingHorizontal: spacing[2],
          borderWidth: 1,
          borderColor: isValid ? (isDirty ? colors.primary : colors.outline) : colors.danger,
          borderRadius: radius.sm,
          backgroundColor: colors.surface,
          color: colors.onSurface,
          fontSize: 12,
          fontVariant: ['tabular-nums'],
        }}
      />
    </View>
  );
}

export function TokenEditorPanel() {
  const { colors, isDark } = useTheme();
  const store = useThemeOverrideStore();
  // Panel can edit either mode independently — defaults to whatever the
  // app is currently rendering so "what you see is what you tweak."
  const [mode, setMode] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');

  // Base colors for the selected mode (unmodified palette from tokens.ts).
  const baseColors = mode === 'dark' ? darkColors : lightColors;
  // Overrides currently committed to the store for this mode.
  const appliedOverrides = mode === 'dark' ? store.dark : store.light;

  // Local draft buffer — what the user is typing. Seeded with the
  // currently-effective value (override if set, otherwise base). Keyed
  // by `mode` so flipping modes rehydrates the form.
  const [draft, setDraft] = useState<ColorOverrides>(() => ({ ...appliedOverrides }));

  // Flip mode → rehydrate draft from that mode's applied overrides.
  React.useEffect(() => {
    setDraft({ ...appliedOverrides });
    // `appliedOverrides` reference is fine as dep — store returns stable
    // refs between mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const effective = (key: keyof ColorTokens): string => {
    return draft[key] ?? appliedOverrides[key] ?? baseColors[key];
  };

  const hasDirty = useMemo(() => {
    return GROUPS.some((g) =>
      g.keys.some((k) => {
        const cur = draft[k] ?? appliedOverrides[k] ?? baseColors[k];
        return cur.toUpperCase() !== baseColors[k].toUpperCase();
      }),
    );
  }, [draft, appliedOverrides, baseColors]);

  const apply = () => {
    // Commit only well-formed hex values. Invalid entries are left in
    // the draft so the user can see + fix them, but don't poison the
    // theme with something like "#xyz".
    const patch: ColorOverrides = {};
    for (const group of GROUPS) {
      for (const key of group.keys) {
        const raw = draft[key];
        if (raw === undefined) continue;
        const clean = sanitize(raw);
        if (clean && clean.toUpperCase() !== baseColors[key].toUpperCase()) {
          patch[key] = clean;
        }
      }
    }
    store.applyBatch(mode, patch);
  };

  const reset = () => {
    store.resetMode(mode);
    setDraft({});
  };

  const copyAsTs = async () => {
    // Emit a full ColorTokens object for the current mode, with live
    // overrides applied. Easy to paste over `lightColors` / `darkColors`
    // in src/theme/tokens.ts to ship the tweak permanently.
    const lines: string[] = [];
    lines.push(`export const ${mode}Colors = {`);
    for (const group of GROUPS) {
      lines.push(`  // ── ${group.title} ──`);
      for (const key of group.keys) {
        const val = effective(key);
        lines.push(`  ${key}: '${val}',`);
      }
    }
    lines.push(`} as const;`);
    const ts = lines.join('\n');

    if (Platform.OS === 'web') {
      try {
        await (navigator as { clipboard?: { writeText: (s: string) => Promise<void> } }).clipboard?.writeText(ts);
        Alert.alert('Copied', `${mode}Colors copied to clipboard. Paste into src/theme/tokens.ts.`);
      } catch {
        Alert.alert('Copy failed', 'Clipboard API unavailable. Here is the text:\n\n' + ts);
      }
    } else {
      Alert.alert(`${mode}Colors`, ts);
    }
  };

  return (
    <View
      style={{
        width: 340,
        borderLeftWidth: 1,
        borderLeftColor: colors.outlineVariant,
        backgroundColor: withAlpha(colors.surfaceVariant, 0.4),
      }}
    >
      {/* Header — title + mode toggle */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingTop: spacing[5],
          paddingBottom: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
          gap: spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="headingSm">Tokens</Text>
          <Text variant="caption" color={colors.onSurfaceMuted}>
            Dev · session
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 2,
            backgroundColor: colors.surfaceVariant,
            borderRadius: radius.md,
            gap: 2,
          }}
        >
          {(['light', 'dark'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  paddingVertical: spacing[1] + 2,
                  borderRadius: radius.sm,
                  backgroundColor: active ? colors.surface : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text variant="labelMd" color={active ? colors.onSurface : colors.onSurfaceMuted}>
                  {m === 'light' ? 'Light' : 'Dark'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Groups */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] }}
      >
        {GROUPS.map((group) => (
          <View key={group.title} style={{ gap: spacing[1] }}>
            <Text variant="overline" color={colors.onSurfaceMuted}>
              {group.title}
            </Text>
            {group.keys.map((key) => (
              <TokenRow
                key={key}
                tokenKey={key}
                baseValue={baseColors[key]}
                draftValue={draft[key] ?? appliedOverrides[key] ?? baseColors[key]}
                onDraftChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Action bar — sticky bottom */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          padding: spacing[3],
          gap: spacing[2],
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Button variant="filled" size="sm" onPress={apply} fullWidth>
            Apply
          </Button>
          <Button variant="outlined" size="sm" onPress={reset} disabled={!hasDirty && Object.keys(appliedOverrides).length === 0}>
            Reset
          </Button>
        </View>
        <Button variant="ghost" size="sm" onPress={copyAsTs} fullWidth>
          Copy as TS
        </Button>
      </View>
    </View>
  );
}
