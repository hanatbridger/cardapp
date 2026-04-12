import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { getCardScore } from '../data/card-scores';
import { getArtistScore } from '../data/artist-scores';
import { getPSAPopulation } from '../data/psa-population';
import { getValuation } from '../services/price-prediction';
import type { PokemonCard } from '../types/card';

interface CardFundamentalsProps {
  card: PokemonCard;
  marketPrice?: number;
}

function FundamentalRow({
  label,
  value,
  valueColor,
  subValue,
}: {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing[3],
      }}
    >
      <Text variant="bodySm" color={colors.onSurfaceVariant}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="labelLg" color={valueColor}>{value}</Text>
        {subValue && (
          <Text variant="caption" color={colors.onSurfaceMuted}>{subValue}</Text>
        )}
      </View>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />;
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const { colors } = useTheme();
  const pct = Math.min((score / max) * 100, 100);
  const barColor = pct >= 70 ? colors.success : pct >= 40 ? colors.warning : colors.danger;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
      <View
        style={{
          width: 60,
          height: 4,
          borderRadius: radius.full,
          backgroundColor: colors.outline,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: barColor,
            borderRadius: radius.full,
          }}
        />
      </View>
      <Text variant="labelLg">{score.toFixed(1)}</Text>
    </View>
  );
}

export function CardFundamentals({ card, marketPrice }: CardFundamentalsProps) {
  const { colors } = useTheme();

  const score = getCardScore(card.id);
  const artistScore = card.artist ? getArtistScore(card.artist) : undefined;
  const psaPop = getPSAPopulation(card.id);

  // Compute desirability if we have a score
  let desirability: number | undefined;
  if (score) {
    desirability =
      score.characterPremium * 0.45 +
      score.artworkHype * 0.45 +
      score.universalAppeal * 0.10;
  }

  // Check if we have any data to show
  const hasAnyData = score || card.artist || psaPop || card.set.releaseDate;
  if (!hasAnyData) return null;

  const rows: React.ReactNode[] = [];

  // Pull Cost
  if (score) {
    rows.push(
      <View key="pullcost" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[3] }}>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>Pull Cost</Text>
        <ScoreBar score={score.pullCostScore} />
      </View>,
    );
  }

  // Desirability
  if (desirability) {
    rows.push(
      <View key="desirability" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[3] }}>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>Desirability</Text>
        <ScoreBar score={desirability} />
      </View>,
    );
  }

  // Artist
  if (card.artist) {
    rows.push(
      <FundamentalRow
        key="artist"
        label="Artist"
        value={card.artist}
      />,
    );
  }

  // Artist Score
  if (artistScore) {
    rows.push(
      <View key="artistscore" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[3] }}>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>Artist Score</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          {artistScore.score >= 9 && (
            <View style={{ backgroundColor: withAlpha(colors.warning, 0.2), borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: spacing['0.5'] }}>
              <Text variant="labelSm" color={colors.warning}>Top Artist</Text>
            </View>
          )}
          <ScoreBar score={artistScore.score} />
        </View>
      </View>,
    );
  }

  // PSA Population
  if (psaPop) {
    rows.push(
      <FundamentalRow
        key="psapop"
        label="PSA 10 Gem Rate"
        value={`${psaPop.psa10Rate.toFixed(1)}%`}
        subValue={`${psaPop.psa10Pop.toLocaleString()} / ${psaPop.totalPop.toLocaleString()}`}
      />,
    );
  }

  // Set + Release Date
  if (card.set.releaseDate) {
    rows.push(
      <FundamentalRow
        key="set"
        label="Set"
        value={card.set.name}
        subValue={card.set.releaseDate}
      />,
    );
  }

  // Rarity
  if (card.rarity) {
    rows.push(
      <FundamentalRow
        key="rarity"
        label="Rarity"
        value={card.rarity}
      />,
    );
  }

  return (
    <Card>
      <View style={{ gap: 0 }}>
        <Text variant="labelLg" style={{ marginBottom: spacing[1] }}>Fundamentals</Text>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 && <Divider />}
            {row}
          </View>
        ))}
      </View>
    </Card>
  );
}
