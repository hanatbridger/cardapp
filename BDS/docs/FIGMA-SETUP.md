# Bridger Design System — Figma Setup Guide

This document walks through setting up the Figma variable collection, text styles,
component library, and Lucide icons so the Figma MCP server generates clean,
token-based code in Claude.

---

## 1. Create the variable collection

In your Figma team library file, go to **Local variables** and create a collection
named **Bridger Tokens**.

### Color variables

Create these color variables with two modes: **Light** and **Dark**.

```
Group: color/primary
  color/primary-50    Light: #EDF0FF    Dark: #101559
  color/primary-100   Light: #D4DBFF    Dark: #1A2280
  color/primary-200   Light: #B0BBFF    Dark: #242FA6
  color/primary-300   Light: #8B9AFF    Dark: #3344D1
  color/primary-400   Light: #6B7CFF    Dark: #4B5EFC
  color/primary-500   Light: #4B5EFC    Dark: #6B7CFF
  color/primary-600   Light: #3344D1    Dark: #8B9AFF
  color/primary-700   Light: #242FA6    Dark: #B0BBFF
  color/primary-800   Light: #1A2280    Dark: #D4DBFF
  color/primary-900   Light: #101559    Dark: #EDF0FF

Group: color/secondary
  color/secondary-50    Light: #F0FAFB    Dark: #06262D
  color/secondary-100   Light: #D0F0F4    Dark: #0B3F4A
  color/secondary-200   Light: #A3E2EB    Dark: #115B6A
  color/secondary-300   Light: #6DCEDE    Dark: #17788B
  color/secondary-400   Light: #3AB6CC    Dark: #1E97AD
  color/secondary-500   Light: #1E97AD    Dark: #3AB6CC
  color/secondary-600   Light: #17788B    Dark: #6DCEDE
  color/secondary-700   Light: #115B6A    Dark: #A3E2EB
  color/secondary-800   Light: #0B3F4A    Dark: #D0F0F4
  color/secondary-900   Light: #06262D    Dark: #F0FAFB

Group: color/neutral
  color/neutral-0     Light: #FFFFFF    Dark: #0D1117
  color/neutral-50    Light: #F8F9FA    Dark: #161B22
  color/neutral-100   Light: #F1F3F5    Dark: #1A1F2E
  color/neutral-200   Light: #E9ECEF    Dark: #343A40
  color/neutral-300   Light: #DEE2E6    Dark: #495057
  color/neutral-400   Light: #CED4DA    Dark: #6C757D
  color/neutral-500   Light: #ADB5BD    Dark: #ADB5BD
  color/neutral-600   Light: #6C757D    Dark: #CED4DA
  color/neutral-700   Light: #495057    Dark: #DEE2E6
  color/neutral-800   Light: #343A40    Dark: #E9ECEF
  color/neutral-900   Light: #212529    Dark: #F1F3F5
  color/neutral-950   Light: #0D1117    Dark: #FFFFFF

Group: color/semantic
  color/success       Light: #059669    Dark: #34D399
  color/success-bg    Light: #ECFDF5    Dark: #0A2E1F
  color/warning       Light: #D97706    Dark: #FBBF24
  color/warning-bg    Light: #FFFBEB    Dark: #2E1F07
  color/danger        Light: #DC2626    Dark: #F87171
  color/danger-bg     Light: #FEF2F2    Dark: #2E0A0A
```

### Spacing variables (number type)

```
Group: space
  space/0       0
  space/0.5     2
  space/1       4
  space/1.5     6
  space/2       8
  space/3       12
  space/4       16
  space/5       20
  space/6       24
  space/8       32
  space/10      40
  space/12      48
  space/16      64
  space/20      80
  space/24      96
  space/32      128
```

### Radius variables (number type)

```
Group: radius
  radius/none     0
  radius/sm       4
  radius/md       8
  radius/lg       12
  radius/xl       16
  radius/2xl      20
  radius/full     9999
```

### Set code syntax for every variable

This is the critical step for MCP integration. For each variable, open the
variable details and set the **Code Syntax** (Web) field:

```
color/primary-500   →  var(--bdg-color-primary)
color/neutral-200   →  var(--bdg-color-outline)
color/neutral-900   →  var(--bdg-color-on-surface)
space/4             →  var(--bdg-space-4)
radius/lg           →  var(--bdg-radius-lg)
```

The MCP server reads these code syntax values and outputs them directly in the
generated code, so Claude produces `var(--bdg-color-primary)` instead of `#4B5EFC`.

---

## 2. Create text styles

Create these text styles in your library. Each maps to a CSS token.

| Style name      | Font   | Size | Weight | Line height | Letter spacing |
|-----------------|--------|------|--------|-------------|----------------|
| bdg/display-lg  | Inter  | 48   | Bold   | 53 (110%)   | -1.5           |
| bdg/display-md  | Inter  | 36   | Bold   | 41 (115%)   | -0.75          |
| bdg/display-sm  | Inter  | 30   | Semi   | 36 (120%)   | -0.5           |
| bdg/heading-lg  | Inter  | 24   | Semi   | 31 (130%)   | -0.25          |
| bdg/heading-md  | Inter  | 20   | Semi   | 27 (135%)   | 0              |
| bdg/heading-sm  | Inter  | 16   | Semi   | 22 (140%)   | 0              |
| bdg/body-lg     | Inter  | 18   | Regular| 29 (160%)   | 0              |
| bdg/body-md     | Inter  | 16   | Regular| 26 (160%)   | 0              |
| bdg/body-sm     | Inter  | 14   | Regular| 21 (150%)   | 0              |
| bdg/label-lg    | Inter  | 14   | Medium | 20 (140%)   | 0.1            |
| bdg/label-md    | Inter  | 12   | Medium | 17 (140%)   | 0.25           |
| bdg/label-sm    | Inter  | 11   | Medium | 14 (130%)   | 0.5            |
| bdg/caption     | Inter  | 12   | Regular| 17 (140%)   | 0.4            |
| bdg/overline    | Inter  | 11   | Semi   | 14 (130%)   | 1.5 (UPPERCASE)|

---

## 3. Install Lucide icons

### Option A: Lucide Icon Importer plugin (recommended)

1. Install the **Lucide Icon Importer** plugin from Figma Community
   https://www.figma.com/community/plugin/1534177137015708208/lucide-icon-importer
2. Run it — it imports all 1,800+ icons as properly structured components
3. Publish the file as a team library

### Option B: Community library file

1. Duplicate the Lucide Icons library file:
   https://www.figma.com/community/file/1080851853377107006/lucide-icons
2. Publish as a team library
3. Enable it in all Bridger project files

### Icon component structure

Each icon should be a component with:
- Frame: 24×24 (default), auto layout, center-aligned
- Vector paths with stroke: `color/neutral-700` variable
- Stroke width: 2px (default), 1.5px variant for dense UI
- Variants: 16px (dense), 20px (default), 24px (touch)

---

## 4. Build core components

Create these master components in your library using Bridger tokens.

### Button

**Variants (property):** Filled, Tonal, Outlined, Ghost, Danger
**Sizes (property):** Small (32px), Medium (40px), Large (48px)
**States:** Default, Hover, Pressed, Disabled, Loading

Structure (auto layout, horizontal, center-aligned):
```
[Button] — auto layout, horizontal, gap: 6, padding: 0 16
  ├── [Icon slot] — 16×16, optional, swap instance
  └── [Label] — text: bdg/label-lg
```

Apply variables:
- Filled: fill = color/primary-500, text = white
- Tonal: fill = color/primary-50, text = color/primary-800
- Outlined: stroke = color/neutral-200, fill = none, text = color/primary-500
- Ghost: fill = transparent, text = color/primary-500
- Danger: fill = color/danger, text = white

Set resizing:
- Button frame: Hug contents (both axes)
- Label: Hug contents
- Icon: Fixed 16×16

### Input

Structure:
```
[Input] — auto layout, vertical, gap: 4
  ├── [Label] — text: bdg/label-lg, optional
  ├── [Field] — auto layout, horizontal, gap: 8, padding: 0 12, h: 40
  │   ├── [Leading icon] — 16×16, optional
  │   ├── [Value] — text: bdg/body-md, fill container
  │   └── [Trailing icon] — 16×16, optional
  └── [Hint] — text: bdg/caption, optional
```

Set resizing:
- Input frame: Fill container (horizontal), Hug contents (vertical)
- Field: Fill container (horizontal), Fixed 40px (vertical)
- Value text: Fill container (horizontal)

### Card

Structure:
```
[Card] — auto layout, vertical, gap: 16, padding: 20
  ├── [Header slot] — auto layout, horizontal
  └── [Content slot] — auto layout, vertical
```

Apply: fill = color/neutral-0, stroke = color/neutral-200, radius = radius/lg
Resizing: Fill container (horizontal), Hug contents (vertical)

### Badge

Structure:
```
[Badge] — auto layout, horizontal, gap: 6, padding: 4 10
  ├── [Dot] — 6×6 circle, optional
  └── [Label] — text: bdg/label-md
```

---

## 5. Auto layout conventions

These conventions ensure the MCP server translates layouts correctly to flexbox.

| Figma concept           | CSS output                            |
|-------------------------|---------------------------------------|
| Auto layout: Vertical   | `flex-direction: column`              |
| Auto layout: Horizontal | `flex-direction: row`                 |
| Gap: 16                 | `gap: var(--bdg-space-4)`             |
| Padding: 20             | `padding: var(--bdg-space-5)`         |
| Fill container          | `flex: 1` or `width: 100%`           |
| Hug contents            | `width: auto` or `width: fit-content` |
| Fixed: 320px            | `width: 320px` (avoid when possible)  |
| Alignment: Center       | `align-items: center`                 |
| Alignment: Space between| `justify-content: space-between`      |
| Min width               | `min-width: Npx`                      |
| Max width               | `max-width: Npx`                      |

### Layer naming rules

- Use PascalCase for components: `CardHeader`, `NavigationItem`
- Use camelCase for semantic groups: `mainContent`, `sidebarNav`
- Never leave default names: `Frame 47`, `Group 12`
- Prefix layout containers: `layoutGrid`, `layoutStack`, `layoutRow`
- Suffix slots: `iconSlot`, `contentSlot`, `actionSlot`

---

## 6. Code Connect setup

Code Connect maps Figma components to code. Set up mappings for each component.

### Install Code Connect CLI

```bash
npm install -g @figma/code-connect
```

### Create mapping files

Place these alongside your React components:

```tsx
// components/button/button.figma.tsx
import figma from "@figma/code-connect";
import { Button } from "./button";

figma.connect(Button, "PASTE_FIGMA_COMPONENT_URL_HERE", {
  props: {
    variant: figma.enum("Variant", {
      Filled: "filled",
      Tonal: "tonal",
      Outlined: "outlined",
      Ghost: "ghost",
      Danger: "danger",
    }),
    size: figma.enum("Size", {
      Small: "sm",
      Medium: "md",
      Large: "lg",
    }),
    icon: figma.instance("Icon slot"),
    label: figma.string("Label"),
    disabled: figma.boolean("Disabled"),
  },
  example: ({ variant, size, icon, label }) => (
    <Button variant={variant} size={size} icon={icon}>
      {label}
    </Button>
  ),
});
```

```tsx
// components/input/input.figma.tsx
import figma from "@figma/code-connect";
import { Input } from "./input";

figma.connect(Input, "PASTE_FIGMA_COMPONENT_URL_HERE", {
  props: {
    label: figma.string("Label"),
    placeholder: figma.string("Placeholder"),
    icon: figma.instance("Leading icon"),
    error: figma.string("Error"),
    hint: figma.string("Hint"),
    size: figma.enum("Size", { Small: "sm", Medium: "md", Large: "lg" }),
  },
  example: ({ label, placeholder, icon, error, hint, size }) => (
    <Input
      label={label}
      placeholder={placeholder}
      icon={icon}
      error={error}
      hint={hint}
      size={size}
    />
  ),
});
```

```tsx
// components/badge/badge.figma.tsx
import figma from "@figma/code-connect";
import { Badge } from "./badge";

figma.connect(Badge, "PASTE_FIGMA_COMPONENT_URL_HERE", {
  props: {
    variant: figma.enum("Variant", {
      Success: "success",
      Warning: "warning",
      Danger: "danger",
      Info: "info",
      Neutral: "neutral",
    }),
    label: figma.children("Label"),
    dot: figma.boolean("Dot"),
  },
  example: ({ variant, label, dot }) => (
    <Badge variant={variant} dot={dot}>
      {label}
    </Badge>
  ),
});
```

### Push mappings

```bash
figma connect publish
```

### Additional v2 component mappings

These follow the same pattern — create a `.figma.tsx` file next to each component:

```tsx
// Tabs
figma.connect(Tabs, "FIGMA_URL", {
  props: {
    variant: figma.enum("Variant", { Underline: "underline", Pill: "pill" }),
    size: figma.enum("Size", { Small: "sm", Medium: "md", Large: "lg" }),
  },
});

// Sidebar Item
figma.connect(SidebarItem, "FIGMA_URL", {
  props: {
    icon: figma.instance("Icon"),
    label: figma.string("Label"),
    active: figma.boolean("Active"),
    badge: figma.string("Badge"),
  },
});

// Modal
figma.connect(Modal, "FIGMA_URL", {
  props: {
    title: figma.string("Title"),
  },
  example: ({ title }) => (
    <Modal open={true} onClose={close} title={title}>
      {figma.children("Content")}
    </Modal>
  ),
});

// Alert
figma.connect(Alert, "FIGMA_URL", {
  props: {
    variant: figma.enum("Variant", {
      Info: "info", Success: "success", Warning: "warning", Danger: "danger",
    }),
    title: figma.string("Title"),
    icon: figma.instance("Icon"),
  },
});

// Table — map as a layout reference, not a functional component
// (tables are data-driven; Code Connect provides the structural pattern)

// Select, Textarea, Toggle, Checkbox, RadioGroup, Avatar, Card
// follow the same pattern as Input and Badge above.
```

Once published, when anyone uses the MCP to implement a Figma design containing
these components, the AI agent will import from `@bridger/ui` instead of
generating new components from scratch.

---

## 7. MCP workflow checklist

When a developer pastes a Figma link into Claude:

1. ✅ Claude runs `get_design_context` — returns structured layout with Bridger variable names
2. ✅ Claude runs `get_screenshot` — visual reference for the node
3. ✅ Claude maps Figma variables → `--bdg-*` CSS tokens
4. ✅ Claude uses Code Connect → imports from `@bridger/ui`
5. ✅ Claude translates auto layout → flexbox with token-based gap/padding
6. ✅ Claude uses real Lucide icon names (never fabricated)
7. ✅ Claude generates React + Tailwind (or plain CSS) with zero hardcoded values

---

## 8. Publish and maintain

1. **Publish the library** — File → Publish library. Include all variables, text styles, components.
2. **Enable in projects** — In each Bridger project file, go to Assets → Team library → Enable "Bridger Design System".
3. **Version updates** — When updating tokens, publish with a description. Team members get the update notification.
4. **Sync with code** — When CSS tokens change, update `bridger-tokens.css` and `bridger.tailwind.config.js` to match.
