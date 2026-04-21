import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import {
  useThemeOverrideStore,
  type ColorOverrides,
  type RadiusOverrides,
} from '../stores/theme-override-store';
import {
  spacing,
  radius as baseRadius,
  lightColors,
  darkColors,
  type ColorTokens,
} from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

/**
 * Dev-only live token editor, mounted on the right side of the design
 * system screen at ≥1024px (web only). Section-aware: the controls
 * track the active left-nav section so designers edit the tokens they
 * see on the preview pane, not an abstract flat list.
 *
 * • Colors  → hex + native color picker, Light/Dark toggle, app-wide live apply
 * • Radii   → sliders, live apply for components using useTheme().radius
 * • Other   → read-only note with copy-as-TS hint
 *
 * Changes are session-only by design. To ship a tweak to production,
 * click "Copy as TS" and paste into `src/theme/tokens.ts`.
 */

export type PanelSection =
  | 'colors'
  | 'typography'
  | 'spacing'
  | 'radii'
  | 'shadows'
  | 'components';

interface Props {
  section: PanelSection;
}

// ── Colors grouping ───────────────────────────────────────────
const COLOR_GROUPS: { title: string; keys: (keyof ColorTokens)[] }[] = [
  { title: 'Brand', keys: ['primary', 'primaryHover', 'primaryActive', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'indigoLift'] },
  { title: 'Surfaces', keys: ['surface', 'surfaceVariant', 'surfaceElevated'] },
  { title: 'Text', keys: ['onSurface', 'onSurfaceVariant', 'onSurfaceMuted'] },
  { title: 'Lines', keys: ['outline', 'outlineVariant', 'outlineStrong', 'skeleton'] },
  { title: 'States', keys: ['success', 'warning', 'danger', 'info'] },
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

// ── Radius: friendly labels per token (component-role, matches ref) ──
// Skipping `none` (always 0) and `full` (9999 pill) — special values
// that don't belong on a size slider.
const RADIUS_ROWS: { key: keyof typeof baseRadius; label: string; hint: string }[] = [
  { key: 'sm', label: 'Inputs & chips', hint: 'Dividers, inline indicators, small chips.' },
  { key: 'md', label: 'Buttons & badges', hint: 'Pulse chips, badges, standard buttons.' },
  { key: 'lg', label: 'Cards', hint: 'Default card radius across the app.' },
  { key: 'xl', label: 'Panels', hint: 'Large panels, glass containers.' },
  { key: '2xl', label: 'Modals & sheets', hint: 'Bottom sheets, modals, dialogs.' },
  { key: '3xl', label: 'Hero surfaces', hint: 'Onboarding heroes, feature cards.' },
];

const RADIUS_MIN = 0;
const RADIUS_MAX = 32;
const RADIUS_STEP = 2;

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function sanitizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_RE.test(withHash) ? withHash.toUpperCase() : null;
}

// ── Web-only native inputs via React.createElement ─────────────
// RN Web doesn't wrap <input type="color" | "range"> — drop to DOM.
// Native never mounts these (panel is gated by width >= 1024).

function ColorWell({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { colors } = useTheme();
  if (Platform.OS !== 'web') {
    return (
      <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: value, borderWidth: 1, borderColor: colors.outline }} />
    );
  }
  return React.createElement('input', {
    type: 'color',
    value: value.length === 9 ? value.slice(0, 7) : value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value.toUpperCase()),
    style: {
      width: 24, height: 24, padding: 0,
      border: `1px solid ${colors.outline}`,
      borderRadius: 6,
      background: 'transparent',
      cursor: 'pointer',
    },
  });
}

function Slider({
  value, min, max, step, onChange, accent,
}: {
  value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; accent: string;
}) {
  if (Platform.OS !== 'web') {
    return <View style={{ height: 4, backgroundColor: accent, flex: 1, borderRadius: 2 }} />;
  }
  return React.createElement('input', {
    type: 'range',
    min, max, step, value,
    onChange: (e: { target: { value: string } }) => onChange(parseFloat(e.target.value)),
    style: {
      flex: 1,
      accentColor: accent,
      cursor: 'pointer',
    },
  });
}

// ── Info (i) icon with hover tooltip — mirrors the reference panel ──
function InfoDot({ hint }: { hint: string }) {
  const { colors } = useTheme();
  // RN doesn't support `title`, but react-native-web forwards it to the
  // DOM — so hover tooltips just work on web. The only place this panel
  // ever mounts is web, so this is fine.
  const dotProps = Platform.OS === 'web' ? ({ title: hint } as Record<string, unknown>) : {};
  return (
    <View
      {...dotProps}
      style={{
        width: 14, height: 14, borderRadius: 7,
        borderWidth: 1, borderColor: colors.outlineStrong,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text variant="labelSm" color={colors.onSurfaceMuted} style={{ fontSize: 9, lineHeight: 10 }}>
        i
      </Text>
    </View>
  );
}

// ── Row primitives ────────────────────────────────────────────

function ColorRow({
  tokenKey, draftValue, baseValue, onDraftChange,
}: {
  tokenKey: keyof ColorTokens;
  draftValue: string;
  baseValue: string;
  onDraftChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  const clean = sanitizeHex(draftValue);
  const isValid = clean !== null;
  const isDirty = (clean ?? '').toUpperCase() !== baseValue.toUpperCase();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] }}>
      <ColorWell value={isValid ? clean! : baseValue} onChange={(hex) => onDraftChange(hex)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="labelSm" numberOfLines={1} color={colors.onSurface}>{tokenKey}</Text>
      </View>
      <TextInput
        value={draftValue}
        onChangeText={onDraftChange}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        style={{
          width: 92,
          paddingVertical: spacing[1],
          paddingHorizontal: spacing[2],
          borderWidth: 1,
          borderColor: isValid ? (isDirty ? colors.primary : colors.outline) : colors.danger,
          borderRadius: 6,
          backgroundColor: colors.surface,
          color: colors.onSurface,
          fontSize: 12,
          fontVariant: ['tabular-nums'],
        }}
      />
    </View>
  );
}

function RadiusRow({
  label, hint, value, onChange, accent,
}: {
  label: string; hint: string;
  value: number; onChange: (v: number) => void;
  accent: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing[1], paddingVertical: spacing[1] + 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <InfoDot hint={hint} />
        <Text variant="bodySm" style={{ flex: 1 }}>{label}</Text>
        <Text
          variant="labelMd"
          color={colors.onSurfaceVariant}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}px
        </Text>
      </View>
      <Slider value={value} min={RADIUS_MIN} max={RADIUS_MAX} step={RADIUS_STEP} onChange={onChange} accent={accent} />
    </View>
  );
}

// ── Panel ─────────────────────────────────────────────────────

export function TokenEditorPanel({ section }: Props) {
  const { colors, isDark } = useTheme();
  const store = useThemeOverrideStore();

  // ── Colors state ───────────────────────────────────────────
  const [mode, setMode] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');
  const baseColors = mode === 'dark' ? darkColors : lightColors;
  const appliedColorOverrides = mode === 'dark' ? store.dark : store.light;
  const [colorDraft, setColorDraft] = useState<ColorOverrides>(() => ({ ...appliedColorOverrides }));
  React.useEffect(() => {
    setColorDraft({ ...appliedColorOverrides });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Radius state ───────────────────────────────────────────
  const appliedRadiusOverrides = store.radius;
  const [radiusDraft, setRadiusDraft] = useState<RadiusOverrides>(() => ({ ...appliedRadiusOverrides }));

  // ── Apply / reset ──────────────────────────────────────────
  const applyAll = () => {
    if (section === 'colors') {
      const patch: ColorOverrides = {};
      for (const group of COLOR_GROUPS) {
        for (const key of group.keys) {
          const raw = colorDraft[key];
          if (raw === undefined) continue;
          const clean = sanitizeHex(raw);
          if (clean && clean.toUpperCase() !== baseColors[key].toUpperCase()) patch[key] = clean;
        }
      }
      store.applyColors(mode, patch);
    } else if (section === 'radii') {
      const patch: RadiusOverrides = {};
      for (const row of RADIUS_ROWS) {
        const v = radiusDraft[row.key];
        if (v !== undefined && v !== baseRadius[row.key]) patch[row.key] = v;
      }
      store.applyRadius(patch);
    }
  };
  const resetAll = () => {
    if (section === 'colors') {
      store.resetColors(mode);
      setColorDraft({});
    } else if (section === 'radii') {
      store.resetRadius();
      setRadiusDraft({});
    }
  };

  // Dirty = any draft value differs from the baked-in default.
  const hasDirty = useMemo(() => {
    if (section === 'colors') {
      return COLOR_GROUPS.some((g) =>
        g.keys.some((k) => {
          const cur = colorDraft[k] ?? appliedColorOverrides[k] ?? baseColors[k];
          return cur.toUpperCase() !== baseColors[k].toUpperCase();
        }),
      );
    }
    if (section === 'radii') {
      return RADIUS_ROWS.some((r) => {
        const cur = radiusDraft[r.key] ?? appliedRadiusOverrides[r.key] ?? baseRadius[r.key];
        return cur !== baseRadius[r.key];
      });
    }
    return false;
  }, [section, colorDraft, radiusDraft, appliedColorOverrides, appliedRadiusOverrides, baseColors]);

  const canEdit = section === 'colors' || section === 'radii';

  // ── Copy as TS ─────────────────────────────────────────────
  const copyAsTs = async () => {
    let ts = '';
    if (section === 'colors') {
      const lines = [`export const ${mode}Colors = {`];
      for (const group of COLOR_GROUPS) {
        lines.push(`  // ── ${group.title} ──`);
        for (const key of group.keys) {
          const eff = colorDraft[key] ?? appliedColorOverrides[key] ?? baseColors[key];
          const clean = sanitizeHex(eff) ?? baseColors[key];
          lines.push(`  ${key}: '${clean}',`);
        }
      }
      lines.push(`} as const;`);
      ts = lines.join('\n');
    } else if (section === 'radii') {
      const lines = [`export const radius = {`];
      // Preserve none/full — they're not editable but still part of the export.
      lines.push(`  none: 0,`);
      for (const row of RADIUS_ROWS) {
        const v = radiusDraft[row.key] ?? appliedRadiusOverrides[row.key] ?? baseRadius[row.key];
        lines.push(`  ${row.key === '2xl' || row.key === '3xl' ? `'${row.key}'` : row.key}: ${v},  // ${row.label}`);
      }
      lines.push(`  full: 9999,`);
      lines.push(`} as const;`);
      ts = lines.join('\n');
    } else {
      Alert.alert('Nothing to copy', 'This section has no editable tokens.');
      return;
    }
    if (Platform.OS === 'web') {
      try {
        await (navigator as { clipboard?: { writeText: (s: string) => Promise<void> } }).clipboard?.writeText(ts);
        Alert.alert('Copied', 'Paste into src/theme/tokens.ts to make it permanent.');
      } catch {
        Alert.alert('Copy failed', ts);
      }
    } else {
      Alert.alert(section, ts);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <View
      style={{
        width: 340,
        borderLeftWidth: 1,
        borderLeftColor: colors.outlineVariant,
        backgroundColor: withAlpha(colors.surfaceVariant, 0.4),
      }}
    >
      {/* Header — "DESIGN TOKENS" overline + Reset/Apply row */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingTop: spacing[5],
          paddingBottom: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
          gap: spacing[3],
        }}
      >
        <Text variant="overline" color={colors.onSurfaceMuted}>Design Tokens</Text>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Button
            variant="outlined"
            size="sm"
            onPress={resetAll}
            disabled={!canEdit || (!hasDirty && Object.keys(appliedColorOverrides).length === 0 && Object.keys(appliedRadiusOverrides).length === 0)}
          >
            Reset
          </Button>
          <Button
            variant="filled"
            size="sm"
            onPress={applyAll}
            disabled={!canEdit || !hasDirty}
            fullWidth
          >
            Apply
          </Button>
        </View>
      </View>

      {/* Body — section-aware */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] }}
      >
        {section === 'colors' && (
          <>
            {/* Light/Dark toggle — scopes the color edits */}
            <View
              style={{
                flexDirection: 'row',
                padding: 2,
                backgroundColor: colors.surfaceVariant,
                borderRadius: 8,
                gap: 2,
                marginBottom: spacing[2],
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
                      borderRadius: 6,
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
            {COLOR_GROUPS.map((group) => (
              <View key={group.title} style={{ gap: spacing[1] }}>
                <Text variant="overline" color={colors.onSurfaceMuted}>{group.title}</Text>
                {group.keys.map((key) => (
                  <ColorRow
                    key={key}
                    tokenKey={key}
                    baseValue={baseColors[key]}
                    draftValue={colorDraft[key] ?? appliedColorOverrides[key] ?? baseColors[key]}
                    onDraftChange={(v) => setColorDraft((d) => ({ ...d, [key]: v }))}
                  />
                ))}
              </View>
            ))}
          </>
        )}

        {section === 'radii' && (
          <View style={{ gap: spacing[1] }}>
            {RADIUS_ROWS.map((row) => {
              const value = radiusDraft[row.key]
                ?? appliedRadiusOverrides[row.key]
                ?? baseRadius[row.key];
              return (
                <RadiusRow
                  key={row.key}
                  label={row.label}
                  hint={row.hint}
                  value={value}
                  onChange={(v) => setRadiusDraft((d) => ({ ...d, [row.key]: v }))}
                  accent={colors.primary}
                />
              );
            })}
            <Text
              variant="caption"
              color={colors.onSurfaceMuted}
              style={{ marginTop: spacing[3], lineHeight: 16 }}
            >
              Live preview uses useTheme().radius. Components importing radius directly from tokens.ts won&apos;t update until you Copy as TS and paste into source.
            </Text>
          </View>
        )}

        {!canEdit && (
          <View style={{ gap: spacing[2] }}>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              No editable tokens for this section yet.
            </Text>
            <Text variant="caption" color={colors.onSurfaceMuted} style={{ lineHeight: 16 }}>
              Switch to Colors or Radii in the left nav to edit. Typography, spacing, and shadows are locked to the brand book.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer — Copy as TS (only meaningful for editable sections) */}
      {canEdit && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.outlineVariant,
            padding: spacing[3],
            backgroundColor: colors.surface,
          }}
        >
          <Button variant="ghost" size="sm" onPress={copyAsTs} fullWidth>
            Copy as TS
          </Button>
        </View>
      )}
    </View>
  );
}
