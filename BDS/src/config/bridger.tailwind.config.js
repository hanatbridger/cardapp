/** @type {import('tailwindcss').Config} */

/*
 * Bridger Design System — Tailwind CSS Configuration
 * v2.1
 *
 * CUSTOMIZATION NOTE:
 * Semantic colors (primary, secondary, success, etc.) reference CSS variables
 * from bridger-tokens.css. Change your brand colors in that ONE file and
 * both CSS and Tailwind stay in sync automatically.
 *
 * Raw palette colors (bdg.palette.*) are hardcoded here as a fallback for
 * cases where the CSS file isn't loaded (Storybook, email templates, etc).
 * If you change the palette in bridger-tokens.css, update these too — or
 * just use the semantic classes (bg-bdg-primary, text-bdg-on-surface, etc.)
 * which always pull from the CSS variables.
 *
 * Usage:
 *   import bridgerPreset from './bridger.tailwind.config.js';
 *   export default {
 *     presets: [bridgerPreset],
 *     content: ['./src/**/*.{js,ts,jsx,tsx}'],
 *   };
 */

export default {
  theme: {
    extend: {
      colors: {
        bdg: {
          /* ── Semantic colors (reference CSS variables — single source of truth) ── */
          primary:           'var(--bdg-color-primary)',
          'on-primary':      'var(--bdg-color-on-primary)',
          'primary-container': 'var(--bdg-color-primary-container)',
          secondary:         'var(--bdg-color-secondary)',
          'on-secondary':    'var(--bdg-color-on-secondary)',
          surface:           'var(--bdg-color-surface)',
          'surface-variant': 'var(--bdg-color-surface-variant)',
          'on-surface':      'var(--bdg-color-on-surface)',
          'on-surface-variant': 'var(--bdg-color-on-surface-variant)',
          outline:           'var(--bdg-color-outline)',
          'outline-variant': 'var(--bdg-color-outline-variant)',
          success:           'var(--bdg-color-success)',
          'success-container': 'var(--bdg-color-success-container)',
          warning:           'var(--bdg-color-warning)',
          'warning-container': 'var(--bdg-color-warning-container)',
          danger:            'var(--bdg-color-danger)',
          'danger-container': 'var(--bdg-color-danger-container)',
          info:              'var(--bdg-color-info)',
          'info-container':  'var(--bdg-color-info-container)',
          skeleton:          'var(--bdg-color-skeleton)',

          /* ── Raw palette (fallback — update if you change bridger-tokens.css) ── */
          palette: {
            primary: {
              50:  '#EDF0FF', 100: '#D4DBFF', 200: '#B0BBFF', 300: '#8B9AFF', 400: '#6B7CFF',
              500: '#4B5EFC', 600: '#3344D1', 700: '#242FA6', 800: '#1A2280', 900: '#101559',
            },
            secondary: {
              50:  '#F0FAFB', 100: '#D0F0F4', 200: '#A3E2EB', 300: '#6DCEDE', 400: '#3AB6CC',
              500: '#1E97AD', 600: '#17788B', 700: '#115B6A', 800: '#0B3F4A', 900: '#06262D',
            },
            neutral: {
              0:   '#FFFFFF', 50:  '#F8F9FA', 100: '#F1F3F5', 200: '#E9ECEF', 300: '#DEE2E6',
              400: '#CED4DA', 500: '#ADB5BD', 600: '#6C757D', 700: '#495057', 800: '#343A40',
              900: '#212529', 950: '#0D1117',
            },
            success: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 400: '#34D399', 600: '#059669', 800: '#065F46' },
            warning: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 400: '#FBBF24', 600: '#D97706', 800: '#92400E' },
            danger:  { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 400: '#F87171', 600: '#DC2626', 800: '#991B1B' },
            info:    { 50: '#EDF0FF', 100: '#D4DBFF', 200: '#B0BBFF', 400: '#6B7CFF', 600: '#4B5EFC', 800: '#1A2280' },
          },
        },
      },

      fontFamily: {
        sans: ['var(--bdg-font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['var(--bdg-font-mono)', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },

      fontSize: {
        'bdg-display-lg': ['var(--bdg-type-display-lg-size, 48px)', { lineHeight: 'var(--bdg-type-display-lg-line, 1.1)', fontWeight: 'var(--bdg-type-display-lg-weight, 700)', letterSpacing: 'var(--bdg-type-display-lg-tracking, -1.5px)' }],
        'bdg-display-md': ['var(--bdg-type-display-md-size, 36px)', { lineHeight: 'var(--bdg-type-display-md-line, 1.15)', fontWeight: 'var(--bdg-type-display-md-weight, 700)', letterSpacing: 'var(--bdg-type-display-md-tracking, -0.75px)' }],
        'bdg-display-sm': ['var(--bdg-type-display-sm-size, 30px)', { lineHeight: 'var(--bdg-type-display-sm-line, 1.2)', fontWeight: 'var(--bdg-type-display-sm-weight, 600)', letterSpacing: 'var(--bdg-type-display-sm-tracking, -0.5px)' }],
        'bdg-heading-lg': ['var(--bdg-type-heading-lg-size, 24px)', { lineHeight: 'var(--bdg-type-heading-lg-line, 1.3)', fontWeight: 'var(--bdg-type-heading-lg-weight, 600)', letterSpacing: 'var(--bdg-type-heading-lg-tracking, -0.25px)' }],
        'bdg-heading-md': ['var(--bdg-type-heading-md-size, 20px)', { lineHeight: 'var(--bdg-type-heading-md-line, 1.35)', fontWeight: 'var(--bdg-type-heading-md-weight, 600)' }],
        'bdg-heading-sm': ['var(--bdg-type-heading-sm-size, 16px)', { lineHeight: 'var(--bdg-type-heading-sm-line, 1.4)', fontWeight: 'var(--bdg-type-heading-sm-weight, 600)' }],
        'bdg-body-lg':    ['var(--bdg-type-body-lg-size, 18px)', { lineHeight: 'var(--bdg-type-body-lg-line, 1.6)', fontWeight: 'var(--bdg-type-body-lg-weight, 400)' }],
        'bdg-body-md':    ['var(--bdg-type-body-md-size, 16px)', { lineHeight: 'var(--bdg-type-body-md-line, 1.6)', fontWeight: 'var(--bdg-type-body-md-weight, 400)' }],
        'bdg-body-sm':    ['var(--bdg-type-body-sm-size, 14px)', { lineHeight: 'var(--bdg-type-body-sm-line, 1.5)', fontWeight: 'var(--bdg-type-body-sm-weight, 400)' }],
        'bdg-label-lg':   ['var(--bdg-type-label-lg-size, 14px)', { lineHeight: 'var(--bdg-type-label-lg-line, 1.4)', fontWeight: 'var(--bdg-type-label-lg-weight, 500)', letterSpacing: 'var(--bdg-type-label-lg-tracking, 0.1px)' }],
        'bdg-label-md':   ['var(--bdg-type-label-md-size, 12px)', { lineHeight: 'var(--bdg-type-label-md-line, 1.4)', fontWeight: 'var(--bdg-type-label-md-weight, 500)', letterSpacing: 'var(--bdg-type-label-md-tracking, 0.25px)' }],
        'bdg-label-sm':   ['var(--bdg-type-label-sm-size, 11px)', { lineHeight: 'var(--bdg-type-label-sm-line, 1.3)', fontWeight: 'var(--bdg-type-label-sm-weight, 500)', letterSpacing: 'var(--bdg-type-label-sm-tracking, 0.5px)' }],
        'bdg-caption':    ['var(--bdg-type-caption-size, 12px)', { lineHeight: 'var(--bdg-type-caption-line, 1.4)', fontWeight: 'var(--bdg-type-caption-weight, 400)', letterSpacing: 'var(--bdg-type-caption-tracking, 0.4px)' }],
        'bdg-overline':   ['var(--bdg-type-overline-size, 11px)', { lineHeight: 'var(--bdg-type-overline-line, 1.3)', fontWeight: 'var(--bdg-type-overline-weight, 600)', letterSpacing: 'var(--bdg-type-overline-tracking, 1.5px)' }],
      },

      spacing: {
        'bdg-0':   'var(--bdg-space-0, 0px)',
        'bdg-0.5': 'var(--bdg-space-0-5, 2px)',
        'bdg-1':   'var(--bdg-space-1, 4px)',
        'bdg-1.5': 'var(--bdg-space-1-5, 6px)',
        'bdg-2':   'var(--bdg-space-2, 8px)',
        'bdg-3':   'var(--bdg-space-3, 12px)',
        'bdg-4':   'var(--bdg-space-4, 16px)',
        'bdg-5':   'var(--bdg-space-5, 20px)',
        'bdg-6':   'var(--bdg-space-6, 24px)',
        'bdg-8':   'var(--bdg-space-8, 32px)',
        'bdg-10':  'var(--bdg-space-10, 40px)',
        'bdg-12':  'var(--bdg-space-12, 48px)',
        'bdg-16':  'var(--bdg-space-16, 64px)',
        'bdg-20':  'var(--bdg-space-20, 80px)',
        'bdg-24':  'var(--bdg-space-24, 96px)',
        'bdg-32':  'var(--bdg-space-32, 128px)',
      },

      borderRadius: {
        'bdg-none': 'var(--bdg-radius-none, 0)',
        'bdg-sm':   'var(--bdg-radius-sm, 4px)',
        'bdg-md':   'var(--bdg-radius-md, 8px)',
        'bdg-lg':   'var(--bdg-radius-lg, 12px)',
        'bdg-xl':   'var(--bdg-radius-xl, 16px)',
        'bdg-2xl':  'var(--bdg-radius-2xl, 20px)',
        'bdg-full': 'var(--bdg-radius-full, 9999px)',
      },

      boxShadow: {
        'bdg-sm': 'var(--bdg-shadow-sm)',
        'bdg-md': 'var(--bdg-shadow-md)',
        'bdg-lg': 'var(--bdg-shadow-lg)',
        'bdg-xl': 'var(--bdg-shadow-xl)',
      },

      transitionDuration: {
        'bdg-fast':   'var(--bdg-transition-fast, 100ms)',
        'bdg-normal': 'var(--bdg-transition-normal, 150ms)',
        'bdg-slow':   'var(--bdg-transition-slow, 250ms)',
      },

      zIndex: {
        'bdg-dropdown': 'var(--bdg-z-dropdown, 100)',
        'bdg-sticky':   'var(--bdg-z-sticky, 200)',
        'bdg-overlay':  'var(--bdg-z-overlay, 300)',
        'bdg-modal':    'var(--bdg-z-modal, 400)',
        'bdg-popover':  'var(--bdg-z-popover, 500)',
        'bdg-toast':    'var(--bdg-z-toast, 600)',
        'bdg-tooltip':  'var(--bdg-z-tooltip, 700)',
      },

      screens: {
        'bdg-sm':  '640px',
        'bdg-md':  '768px',
        'bdg-lg':  '1024px',
        'bdg-xl':  '1280px',
        'bdg-2xl': '1536px',
      },
    },
  },
};
