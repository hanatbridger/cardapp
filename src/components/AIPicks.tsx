import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { IconTrendingUp, IconTrendingDown, IconBrain } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { useMoney } from '../hooks/use-money';
import { searchCards } from '../services/pokemon-tcg';
import type { CardScore } from '../services/price-prediction';

/**
 * Resolve an unresolved pick ("Manectric #89") to a Pokemon TCG card id
 * on tap so every row lands on the card detail screen. Name search plus
 * a number filter; the "#89" suffix must be stripped first — a "#"
 * inside the Lucene name term matches nothing (which is also why the
 * old search-tab fallback landed on an empty screen).
 */
async function resolvePickCardId(query: string): Promise<string | null> {
  const m = /^(.*?)\s*#\s*(\w+)$/.exec(query.trim());
  const name = (m ? m[1] : query).trim();
  const number = m ? m[2] : null;
  if (name.length < 2) return null;
  try {
    const { cards } = await searchCards(name, {}, 1, 30);
    if (cards.length === 0) return null;
    if (number) {
      const hit = cards.find((c) => c.number.replace(/^0+/, '') === number.replace(/^0+/, ''));
      if (hit) return hit.id;
    }
    return cards[0].id;
  } catch {
    return null;
  }
}

/** Ceiling on the resolve round trip — past this the tap falls through. */
const RESOLVE_TIMEOUT_MS = 2500;

export interface AIPickItem {
  cardId: string;
  cardName: string;
  setName: string;
  imageUrl: string;
  marketPrice: number;
  predictedPrice: number;
  gapPercent: number;
  label: 'undervalued' | 'overvalued' | 'fair';
  /**
   * When set, tile tap drops the user into the search screen with this
   * query pre-filled instead of routing directly to /card/{cardId}.
   * Used by collectrics-sourced picks where we have a TCGPlayer
   * productId but not a Pokemon TCG card id.
   */
  searchQuery?: string;
}

interface AIPicksProps {
  title: string;
  items: AIPickItem[];
  type: 'undervalued' | 'overvalued';
}

function PickCard({ item, type }: { item: AIPickItem; type: 'undervalued' | 'overvalued' }) {
  const { colors } = useTheme();
  const formatMoney = useMoney();
  const isUnder = type === 'undervalued';
  const accentColor = isUnder ? colors.success : colors.danger;
  const Icon = isUnder ? IconTrendingUp : IconTrendingDown;
  const [resolving, setResolving] = useState(false);
  // The timeout only wins the race — the underlying request keeps going,
  // so the settle can land after the user has navigated away.
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const open = async () => {
    if (!item.searchQuery) {
      router.push(`/card/${item.cardId}`);
      return;
    }
    // Server-unresolved pick: find the card now so the user still lands
    // on the detail screen. Only if resolution fails too does the tap
    // degrade to the search tab with the query pre-filled.
    if (resolving) return;
    setResolving(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const id = await Promise.race([
      resolvePickCardId(item.searchQuery),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), RESOLVE_TIMEOUT_MS);
      }),
    ]);
    if (timer) clearTimeout(timer);
    if (!mounted.current) return;
    setResolving(false);
    if (id) {
      router.push(`/card/${id}`);
    } else {
      router.push(
        `/(tabs)/search?focus=1&from=home&q=${encodeURIComponent(item.searchQuery)}`,
      );
    }
  };

  return (
    <Pressable
      onPress={open}
      disabled={resolving}
      accessibilityState={{ busy: resolving }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[1],
        gap: spacing[3],
        // Whole row dims while the pick resolves — a badge-sized spinner
        // alone reads as a dead tap.
        opacity: resolving ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={{ width: 40, height: 56, borderRadius: radius.sm }}
        contentFit="cover"
      />
      <View style={{ flex: 1, gap: spacing['0.5'] }}>
        <Text variant="labelLg" numberOfLines={1}>{item.cardName}</Text>
        <Text variant="caption" color={colors.onSurfaceMuted}>{item.setName}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing['0.5'] }}>
        <Text variant="labelLg">{formatMoney(item.marketPrice)}</Text>
        {resolving ? (
          <ActivityIndicator size="small" color={colors.onSurfaceMuted} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing['0.5'] }}>
            <Icon size={12} color={accentColor} />
            <Text variant="labelSm" color={accentColor}>
              {isUnder ? '+' : ''}{item.gapPercent.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function AIPicks({ title, items, type }: AIPicksProps) {
  const { colors } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
        <IconBrain size={14} color={colors.primary} />
        <Text variant="labelLg" color={colors.onSurfaceVariant}>
          {title}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: radius.lg,
          padding: spacing[3],
        }}
      >
        {items.slice(0, 5).map((item, i) => (
          <View key={item.cardId}>
            <PickCard item={item} type={type} />
            {i < items.length - 1 && i < 4 && (
              <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing[1] }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
