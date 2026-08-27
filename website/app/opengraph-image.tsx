import { ImageResponse } from 'next/og';

export const alt = 'CardPulse — Pokémon card price tracker with target-price alerts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Generated at build time, not per request. Brand canvas is the same
// #5739FF as the app icon and launch screen.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#5739FF',
          color: '#F9FAFB',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 34, opacity: 0.8, marginBottom: 28 }}>CardPulse</div>
        <div style={{ fontSize: 78, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
          Know what your cards are worth.
        </div>
        <div style={{ fontSize: 32, opacity: 0.85, marginTop: 32 }}>
          One list. Live prices. A push when a card hits your price.
        </div>
      </div>
    ),
    size,
  );
}
