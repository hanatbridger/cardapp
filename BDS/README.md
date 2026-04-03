# Bridger Design System (BDS) v1.0

A token-based design system built for Bridger agency projects.
Token-based, Figma-first, and optimized for AI-assisted development with Claude.

---

## What's included

```
bridger-design-system/
├── README.md                          ← You are here
├── FIGMA-SETUP.md                     ← Step-by-step Figma library setup guide
│
├── css/
│   └── bridger-tokens.css             ← All CSS custom properties (light + dark mode)
│
├── config/
│   └── bridger.tailwind.config.js     ← Tailwind CSS preset with all BDS tokens
│
├── components/
│   └── bridger-ui.jsx                 ← React component library (Button, Input, Badge, etc.)
│
└── skill/
    └── SKILL.md                       ← Claude skill file for AI-generated UI
```

---

## Quick start

### 1. Add CSS tokens to your project

```html
<link rel="stylesheet" href="bridger-tokens.css" />
```

Or import in your entry file:

```js
import './bridger-tokens.css';
```

### 2. Set up Tailwind (optional)

```js
// tailwind.config.js
import bridgerPreset from './bridger.tailwind.config.js';

export default {
  presets: [bridgerPreset],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
};
```

### 3. Use components

```tsx
import { Button, Input, Badge, Card, Toggle, MetricCard } from '@bridger/ui';
import { Search, Plus, TrendingUp } from 'lucide-react';

function Dashboard() {
  return (
    <Card>
      <Input icon={Search} placeholder="Search projects..." />
      <Button variant="filled" icon={Plus}>New project</Button>
      <Badge variant="success">Active</Badge>
      <MetricCard
        label="Revenue"
        value="$42,850"
        trend={12.5}
        trendLabel="vs last month"
        icon={TrendingUp}
      />
    </Card>
  );
}
```

### 4. Install the Claude skill

Copy `skill/SKILL.md` into your project's skill directory. When Claude generates
UI for a Bridger project, it will automatically use BDS tokens, components, and
Lucide icons.

For Claude Code: place in `.claude/skills/bridger-design-system/SKILL.md`
For Claude.ai: upload as project knowledge or reference in system prompt.

### 5. Set up Figma

Follow the step-by-step guide in `FIGMA-SETUP.md` to:
- Create the Bridger Tokens variable collection
- Set up text styles matching the type scale
- Install Lucide icons as a Figma library
- Build core components with proper auto layout
- Configure Code Connect mappings

---

## Architecture

### Three-layer token system

```
Reference tokens (raw values)
  │  --bdg-ref-primary-500: #4B5EFC
  │
  ▼
System tokens (semantic aliases)
  │  --bdg-color-primary: var(--bdg-ref-primary-500)
  │
  ▼
Component tokens (scoped per element)
     --bdg-button-bg: var(--bdg-color-primary)
```

This is Bridger's three-layer token architecture. Figma variables map to the system
layer; CSS custom properties implement them in code. The MCP server bridges the
two automatically.

### Figma → Code pipeline

```
Designer (Figma)                    Developer (Claude + IDE)
┌─────────────────┐                ┌─────────────────────────┐
│ Uses BDS vars    │  ── MCP ──▶  │ get_design_context       │
│ Uses auto layout │               │ get_screenshot           │
│ Uses components  │               │ Maps vars → --bdg-*      │
│ Uses Lucide icons│               │ Uses Code Connect        │
│ Names layers     │               │ Generates React + tokens │
└─────────────────┘                └─────────────────────────┘
```

---

## Icons

Using **Lucide** (lucide-react v1.x) — 1,694+ open-source icons.

**Critical rule:** Never fabricate icon names. Only use verified Lucide icons.

```tsx
import { Search, Bell, Settings, ChevronRight } from 'lucide-react';

// Sizes
<Search size={16} />  // Dense UI
<Search size={20} />  // Default
<Search size={24} />  // Touch targets
```

Figma: Install via the Lucide Icon Importer plugin and publish as a team library.

---

## Dark mode

Automatic via `prefers-color-scheme`. All tokens have light and dark values.

For manual toggle, add the `.bdg-dark` class to a parent element:

```html
<div class="bdg-dark">
  <!-- All children use dark mode tokens -->
</div>
```

---

## Contributing

1. Token changes: update `bridger-tokens.css`, `bridger.tailwind.config.js`,
   `SKILL.md`, and Figma variables simultaneously.
2. New components: add to `bridger-ui.jsx`, create Figma component with proper
   auto layout and variables, add Code Connect mapping.
3. New icons: only add icons that exist in the Lucide library.

---

## License

Internal use — Bridger agency projects only.
