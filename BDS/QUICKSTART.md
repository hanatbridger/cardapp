# Quickstart: New Bridger Project

**Time:** ~5 minutes. **Result:** A project where Claude Code generates on-brand UI automatically.

---

## Step 1 — Create your project

```bash
# Create a new project (React example — use whatever framework you want)
npm create vite@latest my-app -- --template react
cd my-app
npm install
```

## Step 2 — Drop in the design system

Copy the entire `bridger-design-system/` package contents into your project root. The critical pieces:

```
my-app/
├── CLAUDE.md                          ← already in package
├── .cursorrules                       ← already in package
├── .claude/skills/bridger-design-system/
│   └── SKILL.md                       ← already in package
└── src/
    ├── styles/bridger-tokens.css      ← already in package
    ├── config/bridger.tailwind.config.js
    ├── components/bridger-ui.jsx
    └── logo_bridger.svg
```

## Step 3 — Open Claude Code and let it do the wiring

```bash
claude
```

Claude reads `CLAUDE.md` on startup, which tells it about the design system. Tell it:

> "Set up the Bridger design system in this project — import the tokens, install dependencies, and configure everything."

Claude will handle the rest: importing the CSS tokens into the app entry file, installing `lucide-react`, setting up Tailwind if you're using it, and anything else the project needs. From here on, every UI it builds will use Bridger tokens automatically.

---

## Verify it's working

Ask Claude to build something:

> "Build me a settings page with a sidebar nav, a profile card, and a notifications toggle."

You should see it use:
- `var(--bdg-color-*)` for all colors
- `var(--bdg-space-*)` for spacing
- `lucide-react` for icons (real names only)
- Inter font
- 8px/12px border radius
- Light and dark mode support

If it hardcodes hex values or uses random fonts, the skill didn't load — check that `.claude/skills/bridger-design-system/SKILL.md` exists at the project root.

---

## Customizing the design system

This is a starting point — change it to match each project's brand.

### Change the brand color

Update in **one file** — `src/styles/bridger-tokens.css`:

```css
/* Find the reference tokens at the top and change the primary ramp */
--bdg-ref-primary-50:  #your-lightest;
--bdg-ref-primary-500: #your-brand-color;
--bdg-ref-primary-900: #your-darkest;
```

Everything else (buttons, links, focus rings, active states) updates automatically
because system tokens reference these values.

### Change the font

Same file, one line:

```css
--bdg-font-sans: 'Your Font', -apple-system, sans-serif;
```

### Change spacing, radius, or shadows

All in `bridger-tokens.css`. The token names stay the same — just change the values.
Components, the Tailwind config, and Claude's understanding all follow.

### Override a component

Every component accepts `style` and `className` props:

```tsx
<Button style={{ borderRadius: 'var(--bdg-radius-full)' }}>Pill shape</Button>
<Card className="my-card" style={{ padding: 32 }}>Custom padding</Card>
```

### What NOT to change

- Don't rename tokens — the `--bdg-*` prefix and semantic names (`primary`, `surface`,
  `outline`, etc.) are what Claude and Figma MCP understand
- Don't remove tokens — components depend on them existing
- Don't skip the reference/system separation — it's what makes theming work

---

## Implementing a Figma design

When a designer hands you a Figma link:

1. Make sure the Figma MCP server is connected in your Claude Code settings
2. Paste the link and say: **"Implement this using the Bridger design system"**
3. Claude will run `get_design_context` → `get_screenshot` → generate code with Bridger tokens

This works best when the Figma file uses Bridger variables (see `docs/FIGMA-SETUP.md`).

---

## Using the component library

```jsx
import { Button, Input, Badge, Card, Toggle, MetricCard } from './components/bridger-ui';
import { Search, Plus, TrendingUp } from 'lucide-react';

<Card>
  <Input icon={Search} placeholder="Search..." />
  <Button variant="filled" icon={Plus}>Create</Button>
  <Badge variant="success">Live</Badge>
</Card>
```

**Button variants:** `filled` · `tonal` · `outlined` · `ghost` · `danger`
**Button sizes:** `sm` (32px) · `md` (40px) · `lg` (48px)
**Badge variants:** `success` · `warning` · `danger` · `info` · `neutral`

---

## Quick reference

| What | Token | Example |
|------|-------|---------|
| Primary blue | `--bdg-color-primary` | `#4B5EFC` |
| Body text | `--bdg-color-on-surface` | `#212529` |
| Borders | `--bdg-color-outline` | `#E9ECEF` |
| Card background | `--bdg-color-surface` | `#FFFFFF` |
| Default spacing | `--bdg-space-4` | `16px` |
| Card radius | `--bdg-radius-lg` | `12px` |
| Button radius | `--bdg-radius-md` | `8px` |
| Brand orange | `#F15B28` | Logo accent only |

---

## Troubleshooting

**Claude isn't using the design system**
→ Check `.claude/skills/bridger-design-system/SKILL.md` exists at project root.

**Colors look wrong in dark mode**
→ Make sure `bridger-tokens.css` is imported. It handles light/dark automatically via `prefers-color-scheme`.

**Icon not found error**
→ The icon name was fabricated. Only use names from the real Lucide library: https://lucide.dev/icons

**Figma MCP not returning Bridger variables**
→ The Figma file needs Bridger variables set up. See `docs/FIGMA-SETUP.md`.
