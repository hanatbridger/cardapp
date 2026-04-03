# Bridger Design System — Project Rules

This project uses the Bridger Design System (BDS). Read `.claude/skills/bridger-design-system/SKILL.md` before generating any UI.

## Core rules

- All colors via `var(--bdg-*)` tokens. Never hardcode hex.
- All spacing on 4px grid. Use `var(--bdg-space-*)` tokens.
- Font: Inter. No substitutions.
- Icons: `lucide-react` only. Never fabricate icon names.
- Border radius: use `var(--bdg-radius-*)` tokens.
- Components: import from `./components/bridger-ui` (or `@bridger/ui` if published as a package).

## Figma MCP workflow

When given a Figma link:
1. `get_design_context` → structured layout with BDS variables
2. `get_screenshot` → visual reference
3. Map Figma variables → `--bdg-*` CSS tokens
4. Translate auto layout → flexbox with token-based spacing
5. Use Code Connect component mappings when available

## File structure

- `src/styles/bridger-tokens.css` — CSS custom properties (import at app root)
- `src/config/bridger.tailwind.config.js` — Tailwind preset
- `src/components/bridger-ui.jsx` — React component library
- `src/logo_bridger.svg` — Official Bridger logo
