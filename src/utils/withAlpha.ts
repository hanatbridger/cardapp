/**
 * withAlpha — convert any CSS color to an rgba() with the given opacity.
 * Supports `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(...)`, `rgba(...)`.
 * Falls back to the original color if it can't be parsed.
 */
export function withAlpha(color: string, opacity: number): string {
  if (!color) return color;
  const o = Math.max(0, Math.min(1, opacity));

  // Hex
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6) return color;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${o})`;
  }

  // rgb / rgba
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${o})`;
  }

  return color;
}
