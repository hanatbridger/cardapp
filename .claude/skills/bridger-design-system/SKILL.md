---
name: bridger-design-system
description: >
  The Bridger Design System skill. Use this skill whenever building, modifying, or reviewing ANY
  user interface, frontend component, design mockup, or visual output for a Bridger project.
  Triggers include: creating React/HTML/CSS components, building pages or screens, implementing
  Figma designs via MCP, generating UI code, styling components, choosing colors or typography,
  selecting icons, creating dashboards, forms, cards, modals, navigation, or any visual element.
  Also trigger when the user mentions "Bridger", "our design system", "BDS", "on-brand", or
  references design tokens, spacing, or component conventions. Even if the user just says
  "build a settings page" or "make a form" in a Bridger project context — use this skill.
---

# Bridger Design System (BDS)

A token-based design system built for Bridger agency projects.
Every UI Claude generates in a Bridger project MUST follow these specifications.

**IMPORTANT — This is a customizable starting point.** The token values (colors, fonts, spacing)
may have been modified from the defaults. Always read the actual token files in the project
rather than assuming the defaults listed here. If `src/styles/bridger-tokens.css` exists,
that file is the source of truth for all values.

---

## Token architecture

Three layers:

1. **Reference tokens** — Raw palette values (`--bdg-ref-primary-500`, `--bdg-ref-neutral-200`, etc.)
2. **System tokens** — Semantic aliases (`--bdg-color-primary`, `--bdg-color-surface`, `--bdg-color-outline`)
3. **Component tokens** — Scoped per element (`--bdg-button-bg`, etc.)

CSS custom property prefix: `--bdg-*`
Tailwind theme key: `bdg`

### How to read the current values

Before generating UI, check the project's `src/styles/bridger-tokens.css` to understand:
- What the current primary/secondary colors are (they may not be the defaults)
- What font family is set (default is Inter, but may have been changed)
- What spacing scale is in use

If the tokens file is not accessible, use the defaults below. But always prefer the
actual file when available.

---

## Colors

### Token structure (defaults — may be customized)

Each color ramp has 10 stops (50–900). The system tokens alias into these:

```
Reference:  --bdg-ref-primary-500        (raw hex value)
System:     --bdg-color-primary           (points to a reference token)
Component:  button background             (points to a system token)
```

**Default primary:** `#4B5EFC` (indigo-blue). **Default secondary:** `#1E97AD` (teal).
These are starting points — projects may use completely different brand colors.

### System token roles (these names stay the same even when colors change)

| Token                          | Role                    |
|--------------------------------|-------------------------|
| `--bdg-color-primary`         | Primary actions, links, focus rings |
| `--bdg-color-on-primary`      | Text on primary-colored backgrounds |
| `--bdg-color-primary-container` | Tonal/soft primary backgrounds |
| `--bdg-color-secondary`       | Secondary actions |
| `--bdg-color-surface`         | Default page/card background |
| `--bdg-color-surface-variant` | Subtle surface (sidebar, table headers) |
| `--bdg-color-on-surface`      | Primary text |
| `--bdg-color-on-surface-variant` | Secondary/muted text |
| `--bdg-color-outline`         | Borders, dividers |
| `--bdg-color-outline-variant` | Subtle borders |
| `--bdg-color-success`         | Success states |
| `--bdg-color-warning`         | Warning states |
| `--bdg-color-danger`          | Error/destructive states |
| `--bdg-color-info`            | Informational states |
| `--bdg-color-skeleton`        | Skeleton loading placeholders |

**Rule:** Always use semantic tokens (`var(--bdg-color-primary)`) in component code,
never reference tokens (`var(--bdg-ref-primary-500)`) directly. This ensures theming works.

---

## Typography

**Default font:** Inter. **May be customized per project.**

Read `--bdg-font-sans` from the tokens file to see the current font family.

### Type scale (structure — sizes are defaults)

| Token         | Default | Weight | Use case                |
|---------------|---------|--------|-------------------------|
| display-lg    | 48px    | 700    | Hero headlines          |
| display-md    | 36px    | 700    | Page titles             |
| display-sm    | 30px    | 600    | Section heroes          |
| heading-lg    | 24px    | 600    | Section headings        |
| heading-md    | 20px    | 600    | Subsection headings     |
| heading-sm    | 16px    | 600    | Card titles, labels     |
| body-lg       | 18px    | 400    | Long-form text          |
| body-md       | 16px    | 400    | **Default body text**   |
| body-sm       | 14px    | 400    | Compact text            |
| label-lg      | 14px    | 500    | Button text, nav items  |
| label-md      | 12px    | 500    | Badges, tags            |
| label-sm      | 11px    | 500    | Micro labels            |
| caption       | 12px    | 400    | Metadata, timestamps    |
| overline      | 11px    | 600    | Category labels (CAPS)  |

---

## Spacing

**Base unit:** 4px grid.

Use `--bdg-space-*` tokens. The scale:
0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128

### When to use what
- **2–4px:** Icon-to-text gap, inline element spacing
- **6–8px:** Compact list items, badge padding, tight groups
- **12–16px:** Component internal padding, stack spacing
- **20–24px:** Card padding, section gaps
- **32–48px:** Section separation, major layout gaps
- **64–128px:** Page-level margins, hero spacing

---

## Border radius

| Token        | Default | Use case                |
|--------------|---------|-------------------------|
| radius-none  | 0       | Sharp edges             |
| radius-sm    | 4px     | Inputs, small elements  |
| radius-md    | 8px     | Buttons, badges         |
| radius-lg    | 12px    | Cards, modals, panels   |
| radius-xl    | 16px    | Large cards, heroes     |
| radius-2xl   | 20px    | Bottom sheets, dialogs  |
| radius-full  | 9999px  | Pills, avatars, toggles |

---

## Elevation / Shadows

Use `--bdg-shadow-sm` through `--bdg-shadow-xl`. Use sparingly — prefer borders for flat UI.
Reserve shadows for floating elements (modals, dropdowns, popovers), drag states, and elevated cards.

---

## Responsive breakpoints

sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

---

## Icons

**Library:** Lucide (`lucide-react` for React, `lucide-vue-next` for Vue, `lucide-svelte` for Svelte)

### CRITICAL RULES
1. **NEVER fabricate icon names.** Only use icons that exist in the Lucide library.
2. If unsure whether an icon name exists, use a generic alternative you're certain of.
3. Common safe icons: Search, Plus, X, Check, ChevronRight, ChevronDown, ArrowRight, Settings, User, Bell, Mail, Home, Edit, Trash2, Eye, EyeOff, Download, Upload, Filter, Star, Heart, Copy, ExternalLink, Info, AlertCircle, AlertTriangle, CheckCircle, HelpCircle, Loader, RefreshCw, Menu, Lock, Globe, Calendar, Clock, MapPin, Phone, Send, MessageSquare, Users, BarChart3, TrendingUp, Activity, Layers, Zap, Shield, Database, Code, Terminal, FileText, Folder, Image, Share2, Bookmark, Tag

### Sizing convention
| Context       | Size  | strokeWidth |
|---------------|-------|-------------|
| Dense UI      | 16px  | 1.5         |
| Default       | 20px  | 2           |
| Touch targets | 24px  | 2           |
| Decorative    | 32px+ | 1.5         |

---

## Component library (v2.1)

All components are in `src/components/bridger-ui.jsx`. Import what you need:
```tsx
import { Button, Sidebar, SidebarItem, Tabs, Table, Modal, useToast } from './components/bridger-ui';
```

### Full inventory

**Core**: Button, Input, Textarea, Select, Checkbox, RadioGroup, Toggle, FileUpload
**Layout**: Card, Divider, Avatar, IconWrapper, MetricCard, AppShell, TopBar
**Navigation**: Sidebar, SidebarItem, SidebarGroup, Tabs, Breadcrumbs
**Data display**: Table, Pagination, ListItem, EmptyState, Skeleton, SkeletonText
**Feedback**: Modal, Alert, Tooltip, ProgressBar, ToastProvider + useToast

### Customization

All components accept a `className` prop for CSS overrides and a `style` prop for
inline overrides. Components use BDS tokens internally, so changing a token value
in `bridger-tokens.css` automatically updates every component that uses it.

To override a specific component's appearance:
```tsx
<Button style={{ borderRadius: 'var(--bdg-radius-full)' }}>Pill button</Button>
<Card className="my-custom-card" style={{ padding: 32 }}>Wide padding</Card>
```

### Buttons
Five variants: `filled`, `tonal`, `outlined`, `ghost`, `danger`
Three sizes: `sm` (32px), `md` (40px), `lg` (48px)
- Always include a Lucide icon for actions (left position)
- Use `filled` for primary CTA, `tonal` for secondary, `outlined` for tertiary
- `danger` only for destructive actions, always with confirmation

### Inputs, Textarea, Select
- All support: `label`, `error`, `hint`, `required`, `className` props
- Select: pass `options` as strings or `{value, label}` objects
- All use `forwardRef` — compatible with React Hook Form and similar libraries

### Cards
- Use `elevated` prop for shadow, otherwise border-only
- Default padding: 20px, override with `padding` prop

### Badges
- Variants: `success`, `warning`, `danger`, `info`, `neutral`
- Status dot on by default, disable with `dot={false}`

### Navigation — Sidebar
```tsx
<AppShell
  topBar={<TopBar left={<Logo />} right={<Avatar name="Jane" />} />}
  sidebar={
    <Sidebar header={<div>My App</div>}>
      <SidebarGroup label="Main">
        <SidebarItem icon={Home} label="Dashboard" active />
        <SidebarItem icon={Users} label="Users" badge="12" />
      </SidebarGroup>
    </Sidebar>
  }
>
  {/* Page content */}
</AppShell>
```

### Navigation — Tabs
```tsx
<Tabs
  tabs={[{ id: 'overview', label: 'Overview' }, { id: 'settings', label: 'Settings', icon: Settings }]}
  activeId="overview"
  onChange={setTab}
  variant="underline"  // or "pill"
/>
```

### Navigation — Breadcrumbs
```tsx
<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects' }, { label: 'Acme' }]} />
```

### Table
```tsx
<Table
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: v => <Badge variant={v}>{v}</Badge> },
    { key: 'date', label: 'Date', align: 'right' },
  ]}
  data={rows}
  onRowClick={(row) => navigate(row.id)}
/>
<Pagination page={page} totalPages={10} onChange={setPage} />
```

### Modal
```tsx
<Modal open={showModal} onClose={() => setShowModal(false)} title="Confirm delete"
  footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="danger" onClick={del}>Delete</Button></>}>
  <p>Are you sure? This cannot be undone.</p>
</Modal>
```

### Toast
```tsx
// Wrap app in <ToastProvider>
const { toast } = useToast();
toast('Project saved!', { variant: 'success' });
toast('Something went wrong', { variant: 'danger', duration: 6000 });
```

### Alert (inline banner)
```tsx
<Alert variant="warning" icon={AlertTriangle} title="Trial expiring" onDismiss={() => {}}>
  Your free trial ends in 3 days. Upgrade to keep access.
</Alert>
```

### Skeleton loading
```tsx
<Skeleton height={200} radius="12px" />
<SkeletonText lines={3} />
<Skeleton variant="circle" height={40} />
```

### Empty state
```tsx
<EmptyState icon={FileText} title="No documents yet" description="Upload a file to get started."
  action={<Button icon={Upload}>Upload file</Button>} />
```

---

## Figma MCP integration

When implementing designs from Figma via the MCP server:

1. `get_design_context` → structured layout data with Bridger variables
2. `get_screenshot` → visual reference for the node
3. Map Figma variables → `--bdg-*` CSS tokens
4. Translate auto layout → flexbox with token-based spacing
5. Use Code Connect component mappings when available

### Auto layout translation
```
Figma auto layout (vertical, gap: 16, padding: 20)
  → display: flex; flex-direction: column; gap: var(--bdg-space-4); padding: var(--bdg-space-5);

Figma "Fill container"  →  flex: 1
Figma "Hug contents"    →  width: auto (or fit-content)
Figma "Fixed"           →  width: Npx (avoid when possible)
```

---

## Dark mode

Automatic via `prefers-color-scheme`, or manual via `.bdg-dark` class.
All tokens have both modes defined. Components work in both without changes.

---

## Anti-patterns — NEVER do these

1. ❌ Use a Lucide icon name you haven't verified exists
2. ❌ Hardcode hex colors instead of using `--bdg-*` tokens
3. ❌ Use spacing values not on the 4px grid
4. ❌ Skip the Figma MCP flow (get_design_context → get_screenshot → implement)
5. ❌ Create components that don't work in both light and dark mode
6. ❌ Use border-radius values not in the radius token set
7. ❌ Assume default token values without checking the project's tokens file
8. ❌ Import from `@bridger/ui` without checking the actual file path in the project
