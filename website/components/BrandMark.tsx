/**
 * The CardPulse prism, identical geometry to src/components/BrandMark.tsx
 * in the app. Facet stays #A5B0FF (indigoLift) in every variant because
 * that is the colour baked into the shipped app icon and launch screen.
 *
 * Brand book: never rotate, stretch, gradient, glow, or place indigo on
 * indigo — use variant="inverse" on the brand canvas.
 */
export function BrandMark({
  size = 28,
  variant = 'color',
}: {
  size?: number;
  variant?: 'color' | 'inverse' | 'mono';
}) {
  const body =
    variant === 'inverse' ? '#F9FAFB' : variant === 'mono' ? 'currentColor' : 'var(--brand)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="CardPulse"
      style={{ display: 'block', flex: 'none' }}
    >
      <path d="M 512 170.667 L 853.333 682.667 L 512 853.333 L 170.667 682.667 Z" fill={body} />
      {variant !== 'mono' && (
        <path d="M 512 170.667 L 853.333 682.667 L 512 512 Z" fill="var(--lift)" />
      )}
    </svg>
  );
}
