import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import {
  IconChartLine,
  IconSparkles,
  IconBookmark,
} from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Button, ScreenBackground, withErrorBoundary } from '../src/components';
import { useUserStore } from '../src/stores/user-store';
import { spacing, radius } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';

interface Slide {
  icon: (color: string) => React.ReactNode;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: (color) => <IconChartLine size={56} color={color} />,
    title: 'Real-time card prices',
    body: 'Track Pokémon card values from live eBay sold listings — updated every few minutes.',
  },
  {
    icon: (color) => <IconSparkles size={56} color={color} />,
    title: 'Spot undervalued cards',
    body: 'Our AI compares pull cost and desirability to flag cards trading below fair value.',
  },
  {
    icon: (color) => <IconBookmark size={56} color={color} />,
    title: 'Build your watchlist',
    body: 'Save your favorite cards, set price alerts, and never miss a market move.',
  },
];

function OnboardingScreen() {
  const { colors } = useTheme();
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(Dimensions.get('window').width);

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      const nextIdx = index + 1;
      scrollRef.current?.scrollTo({ x: nextIdx * width, animated: true });
      setIndex(nextIdx);
    } else {
      finish();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i !== index) setIndex(i);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <ScreenBackground edges={['top', 'bottom']}>
      <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {/* Skip */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[2],
          }}
        >
          <Pressable onPress={finish} hitSlop={12} style={{ padding: spacing[2] }}>
            <Text variant="labelLg" color={colors.onSurfaceVariant}>
              Skip
            </Text>
          </Pressable>
        </View>

        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide, i) => (
            <View
              key={i}
              style={{
                width,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: HORIZONTAL_PADDING * 2,
                gap: spacing[6],
              }}
            >
              <View
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: radius.full,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {slide.icon(colors.primary)}
              </View>
              <View style={{ gap: spacing[3], alignItems: 'center' }}>
                <Text variant="displaySm" style={{ textAlign: 'center' }}>
                  {slide.title}
                </Text>
                <Text
                  variant="bodyLg"
                  color={colors.onSurfaceVariant}
                  style={{ textAlign: 'center' }}
                >
                  {slide.body}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Dots + CTA */}
        <View
          style={{
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingBottom: spacing[6],
            gap: spacing[6],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing[2],
            }}
          >
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  borderRadius: radius.full,
                  backgroundColor: i === index ? colors.primary : colors.outline,
                }}
              />
            ))}
          </View>
          <Button onPress={next} fullWidth size="lg">
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </View>
      </View>
    </ScreenBackground>
  );
}

export default withErrorBoundary(OnboardingScreen, 'Onboarding');
