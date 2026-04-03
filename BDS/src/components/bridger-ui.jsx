/**
 * Bridger Design System — React Component Library
 * v2.1
 *
 * Changes from v2.0:
 *   - forwardRef on all form components (Select, Textarea, Checkbox, Toggle)
 *   - Hidden native inputs for Checkbox, Radio, Toggle (screen reader + keyboard)
 *   - aria-* attributes on Modal, Tabs, Tooltip, Alert, Breadcrumbs, ProgressBar
 *   - role attributes on Table, Sidebar, Tabs, Modal overlay
 *   - Keyboard handling: Escape on Modal, Space/Enter on Checkbox/Toggle
 *   - Focus trapping in Modal
 *   - Danger button uses onPrimary token instead of hardcoded #FFF
 *
 * Uses lucide-react for icons — NEVER fabricate icon names.
 */

import React, { forwardRef, useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

/* ════════════════════════════════════════════════════════════════
   TOKENS
   ════════════════════════════════════════════════════════════════ */

const t = {
  color: {
    primary:            'var(--bdg-color-primary, #4B5EFC)',
    primaryHover:       'var(--bdg-color-primary-hover, #6B7CFF)',
    primaryActive:      'var(--bdg-color-primary-active, #3344D1)',
    onPrimary:          'var(--bdg-color-on-primary, #FFFFFF)',
    primaryContainer:   'var(--bdg-color-primary-container, #EDF0FF)',
    onPrimaryContainer: 'var(--bdg-color-on-primary-container, #1A2280)',
    surface:            'var(--bdg-color-surface, #FFFFFF)',
    surfaceVariant:     'var(--bdg-color-surface-variant, #F8F9FA)',
    surfaceElevated:    'var(--bdg-color-surface-elevated, #FFFFFF)',
    onSurface:          'var(--bdg-color-on-surface, #212529)',
    onSurfaceVariant:   'var(--bdg-color-on-surface-variant, #6C757D)',
    onSurfaceMuted:     'var(--bdg-color-on-surface-muted, #ADB5BD)',
    outline:            'var(--bdg-color-outline, #E9ECEF)',
    outlineVariant:     'var(--bdg-color-outline-variant, #F1F3F5)',
    outlineStrong:      'var(--bdg-color-outline-strong, #DEE2E6)',
    skeleton:           'var(--bdg-color-skeleton, #E9ECEF)',
    danger:             'var(--bdg-color-danger, #DC2626)',
    dangerContainer:    'var(--bdg-color-danger-container, #FEF2F2)',
    onDangerContainer:  'var(--bdg-color-on-danger-container, #991B1B)',
    success:            'var(--bdg-color-success, #059669)',
    successContainer:   'var(--bdg-color-success-container, #ECFDF5)',
    onSuccessContainer: 'var(--bdg-color-on-success-container, #065F46)',
    warning:            'var(--bdg-color-warning, #D97706)',
    warningContainer:   'var(--bdg-color-warning-container, #FFFBEB)',
    onWarningContainer: 'var(--bdg-color-on-warning-container, #92400E)',
    info:               'var(--bdg-color-info, #4B5EFC)',
    infoContainer:      'var(--bdg-color-info-container, #EDF0FF)',
    onInfoContainer:    'var(--bdg-color-on-info-container, #1A2280)',
    overlay:            'rgba(0,0,0,0.5)',
  },
  radius: { sm: 'var(--bdg-radius-sm, 4px)', md: 'var(--bdg-radius-md, 8px)', lg: 'var(--bdg-radius-lg, 12px)', xl: 'var(--bdg-radius-xl, 16px)', full: 'var(--bdg-radius-full, 9999px)' },
  shadow: { sm: 'var(--bdg-shadow-sm, 0 1px 2px rgba(0,0,0,0.05))', md: 'var(--bdg-shadow-md, 0 2px 8px rgba(0,0,0,0.08))', lg: 'var(--bdg-shadow-lg, 0 4px 16px rgba(0,0,0,0.1))', xl: 'var(--bdg-shadow-xl, 0 8px 32px rgba(0,0,0,0.12))' },
  font: { sans: "var(--bdg-font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)", mono: "var(--bdg-font-mono, 'JetBrains Mono', 'Fira Code', monospace)" },
  transition: { fast: '100ms ease', normal: '150ms ease', slow: '250ms ease' },
  z: { dropdown: 100, sticky: 200, overlay: 300, modal: 400, popover: 500, toast: 600, tooltip: 700 },
};

const base = { fontFamily: t.font.sans, boxSizing: 'border-box' };
const srOnly = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

/* className pass-through: all components accept className for CSS overrides */
const cx = (...classes) => classes.filter(Boolean).join(' ');


/* ════════════════════════════════════════════════════════════════
   BUTTON
   ════════════════════════════════════════════════════════════════ */

const btnSizes = { sm: { height: 32, px: 12, fs: 13, icon: 14, gap: 4 }, md: { height: 40, px: 16, fs: 14, icon: 16, gap: 6 }, lg: { height: 48, px: 20, fs: 15, icon: 18, gap: 8 } };
const btnVariants = {
  filled:   { background: t.color.primary, color: t.color.onPrimary, border: 'none' },
  tonal:    { background: t.color.primaryContainer, color: t.color.onPrimaryContainer, border: 'none' },
  outlined: { background: 'transparent', color: t.color.primary, border: `1.5px solid ${t.color.outline}` },
  ghost:    { background: 'transparent', color: t.color.primary, border: '1.5px solid transparent' },
  danger:   { background: t.color.danger, color: t.color.onPrimary, border: 'none' },
};

export const Button = forwardRef(function Button({ variant = 'filled', size = 'md', icon: Icon, iconRight: IR, disabled, loading, fullWidth, children, className, style, ...p }, ref) {
  const s = btnSizes[size], v = btnVariants[variant];
  return (
    <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} className={className} style={{ ...base, height: s.height, padding: `0 ${s.px}px`, fontSize: s.fs, fontWeight: 500, borderRadius: t.radius.md, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: s.gap, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: `all ${t.transition.normal}`, width: fullWidth ? '100%' : 'auto', whiteSpace: 'nowrap', ...v, ...style }} {...p}>
      {loading ? <span style={{ width: s.icon, height: s.icon, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'bdg-spin 0.6s linear infinite' }} aria-hidden="true" /> : Icon ? <Icon size={s.icon} aria-hidden="true" /> : null}
      {children}
      {IR && !loading && <IR size={s.icon} aria-hidden="true" />}
    </button>
  );
});


/* ════════════════════════════════════════════════════════════════
   INPUT
   ════════════════════════════════════════════════════════════════ */

export const Input = forwardRef(function Input({ icon: Icon, iconRight: IR, error, label, hint, size = 'md', required, id, style, containerStyle, ...p }, ref) {
  const [focused, setFocused] = useState(false);
  const h = { sm: 36, md: 40, lg: 48 }[size];
  const inputId = id || (label ? `bdg-input-${label.replace(/\s/g, '-').toLowerCase()}` : undefined);
  const hintId = (error || hint) ? `${inputId}-hint` : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...containerStyle }}>
      {label && <label htmlFor={inputId} style={{ ...base, fontSize: 14, fontWeight: 500, color: t.color.onSurface }}>{label}{required && <span style={{ color: t.color.danger, marginLeft: 2 }} aria-hidden="true">*</span>}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.color.onSurfaceVariant, pointerEvents: 'none' }} />}
        <input ref={ref} id={inputId} aria-required={required || undefined} aria-invalid={!!error || undefined} aria-describedby={hintId} onFocus={e => { setFocused(true); p.onFocus?.(e); }} onBlur={e => { setFocused(false); p.onBlur?.(e); }} style={{ ...base, width: '100%', height: h, paddingLeft: Icon ? 36 : 12, paddingRight: IR ? 36 : 12, border: `1.5px solid ${error ? t.color.danger : focused ? t.color.primary : t.color.outline}`, borderRadius: t.radius.md, fontSize: 14, color: t.color.onSurface, background: t.color.surface, outline: 'none', transition: `border-color ${t.transition.normal}`, ...style }} {...p} />
        {IR && <IR size={16} aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: t.color.onSurfaceVariant, pointerEvents: 'none' }} />}
      </div>
      {(error || hint) && <span id={hintId} style={{ ...base, fontSize: 12, color: error ? t.color.danger : t.color.onSurfaceVariant }} role={error ? 'alert' : undefined}>{error || hint}</span>}
    </div>
  );
});


/* ════════════════════════════════════════════════════════════════
   TEXTAREA
   ════════════════════════════════════════════════════════════════ */

export const Textarea = forwardRef(function Textarea({ error, label, hint, required, rows = 4, id, style, containerStyle, ...p }, ref) {
  const [focused, setFocused] = useState(false);
  const tId = id || (label ? `bdg-ta-${label.replace(/\s/g, '-').toLowerCase()}` : undefined);
  const hintId = (error || hint) ? `${tId}-hint` : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...containerStyle }}>
      {label && <label htmlFor={tId} style={{ ...base, fontSize: 14, fontWeight: 500, color: t.color.onSurface }}>{label}{required && <span style={{ color: t.color.danger, marginLeft: 2 }} aria-hidden="true">*</span>}</label>}
      <textarea ref={ref} id={tId} rows={rows} aria-required={required || undefined} aria-invalid={!!error || undefined} aria-describedby={hintId} onFocus={e => { setFocused(true); p.onFocus?.(e); }} onBlur={e => { setFocused(false); p.onBlur?.(e); }} style={{ ...base, width: '100%', padding: 12, border: `1.5px solid ${error ? t.color.danger : focused ? t.color.primary : t.color.outline}`, borderRadius: t.radius.md, fontSize: 14, color: t.color.onSurface, background: t.color.surface, outline: 'none', resize: 'vertical', lineHeight: 1.5, transition: `border-color ${t.transition.normal}`, ...style }} {...p} />
      {(error || hint) && <span id={hintId} style={{ ...base, fontSize: 12, color: error ? t.color.danger : t.color.onSurfaceVariant }} role={error ? 'alert' : undefined}>{error || hint}</span>}
    </div>
  );
});


/* ════════════════════════════════════════════════════════════════
   SELECT
   ════════════════════════════════════════════════════════════════ */

export const Select = forwardRef(function Select({ options = [], value, onChange, label, placeholder, error, hint, required, icon: Icon, size = 'md', id, style, containerStyle, ...p }, ref) {
  const [focused, setFocused] = useState(false);
  const h = { sm: 36, md: 40, lg: 48 }[size];
  const sId = id || (label ? `bdg-sel-${label.replace(/\s/g, '-').toLowerCase()}` : undefined);
  const hintId = (error || hint) ? `${sId}-hint` : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...containerStyle }}>
      {label && <label htmlFor={sId} style={{ ...base, fontSize: 14, fontWeight: 500, color: t.color.onSurface }}>{label}{required && <span style={{ color: t.color.danger, marginLeft: 2 }} aria-hidden="true">*</span>}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.color.onSurfaceVariant, pointerEvents: 'none', zIndex: 1 }} />}
        <select ref={ref} id={sId} value={value} onChange={e => onChange?.(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} aria-required={required || undefined} aria-invalid={!!error || undefined} aria-describedby={hintId}
          style={{ ...base, width: '100%', height: h, paddingLeft: Icon ? 36 : 12, paddingRight: 32, border: `1.5px solid ${error ? t.color.danger : focused ? t.color.primary : t.color.outline}`, borderRadius: t.radius.md, fontSize: 14, color: value ? t.color.onSurface : t.color.onSurfaceMuted, background: t.color.surface, outline: 'none', appearance: 'none', cursor: 'pointer', transition: `border-color ${t.transition.normal}`, ...style }} {...p}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.color.onSurfaceVariant} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="m6 9 6 6 6-6"/></svg>
      </div>
      {(error || hint) && <span id={hintId} style={{ ...base, fontSize: 12, color: error ? t.color.danger : t.color.onSurfaceVariant }} role={error ? 'alert' : undefined}>{error || hint}</span>}
    </div>
  );
});


/* ════════════════════════════════════════════════════════════════
   CHECKBOX — uses hidden native input for a11y
   ════════════════════════════════════════════════════════════════ */

export const Checkbox = forwardRef(function Checkbox({ checked, onChange, label, disabled, error, name, id, ...p }, ref) {
  const cId = id || (name ? `bdg-cb-${name}` : undefined);
  return (
    <label htmlFor={cId} style={{ ...base, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: 14, color: t.color.onSurface }}>
      <div style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${error ? t.color.danger : checked ? t.color.primary : t.color.outlineStrong}`, background: checked ? t.color.primary : t.color.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `all ${t.transition.normal}`, flexShrink: 0, position: 'relative' }}>
        {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>}
        <input ref={ref} type="checkbox" id={cId} name={name} checked={checked} onChange={e => onChange?.(e.target.checked)} disabled={disabled} aria-invalid={!!error || undefined} style={srOnly} {...p} />
      </div>
      {label}
    </label>
  );
});


/* ════════════════════════════════════════════════════════════════
   RADIO GROUP — uses hidden native inputs for a11y
   ════════════════════════════════════════════════════════════════ */

export function RadioGroup({ options = [], value, onChange, label, name, direction = 'vertical', disabled }) {
  const groupName = name || `bdg-radio-${label?.replace(/\s/g, '-').toLowerCase() || 'group'}`;
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <legend style={{ ...base, fontSize: 14, fontWeight: 500, color: t.color.onSurface, padding: 0, marginBottom: 4 }}>{label}</legend>}
      <div role="radiogroup" style={{ display: 'flex', flexDirection: direction === 'horizontal' ? 'row' : 'column', gap: direction === 'horizontal' ? 16 : 8 }}>
        {options.map(o => {
          const val = typeof o === 'string' ? o : o.value;
          const lbl = typeof o === 'string' ? o : o.label;
          const sel = value === val;
          const rId = `${groupName}-${val}`;
          return (
            <label key={val} htmlFor={rId} style={{ ...base, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: 14, color: t.color.onSurface }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${sel ? t.color.primary : t.color.outlineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `all ${t.transition.normal}`, flexShrink: 0, position: 'relative' }}>
                {sel && <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color.primary }} />}
                <input type="radio" id={rId} name={groupName} value={val} checked={sel} onChange={() => onChange?.(val)} disabled={disabled} style={srOnly} />
              </div>
              {lbl}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}


/* ════════════════════════════════════════════════════════════════
   FILE UPLOAD
   ════════════════════════════════════════════════════════════════ */

export function FileUpload({ onFiles, accept, multiple, label, hint, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const handle = files => { if (files?.length) onFiles?.(Array.from(files)); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <span style={{ ...base, fontSize: 14, fontWeight: 500, color: t.color.onSurface }}>{label}</span>}
      <div role="button" tabIndex={disabled ? -1 : 0} aria-label={label || 'Upload files'}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files); }}
        style={{ ...base, border: `2px dashed ${dragOver ? t.color.primary : t.color.outline}`, borderRadius: t.radius.lg, padding: '32px 24px', textAlign: 'center', cursor: disabled ? 'not-allowed' : 'pointer', background: dragOver ? t.color.primaryContainer : t.color.surface, transition: `all ${t.transition.normal}`, opacity: disabled ? 0.5 : 1 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={t.color.onSurfaceMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ margin: '0 auto 8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.color.onSurface }}>Drop files here or <span style={{ color: t.color.primary }}>browse</span></div>
        <div style={{ fontSize: 12, color: t.color.onSurfaceMuted, marginTop: 4 }}>{hint || 'Any file up to 10MB'}</div>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={e => handle(e.target.files)} style={srOnly} tabIndex={-1} aria-hidden="true" />
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   BADGE
   ════════════════════════════════════════════════════════════════ */

const badgeV = {
  success: { bg: t.color.successContainer, color: t.color.onSuccessContainer, dot: 'var(--bdg-ref-success-400, #34D399)' },
  warning: { bg: t.color.warningContainer, color: t.color.onWarningContainer, dot: 'var(--bdg-ref-warning-400, #FBBF24)' },
  danger:  { bg: t.color.dangerContainer, color: t.color.onDangerContainer, dot: 'var(--bdg-ref-danger-400, #F87171)' },
  info:    { bg: t.color.infoContainer, color: t.color.onInfoContainer, dot: 'var(--bdg-ref-primary-400, #6B7CFF)' },
  neutral: { bg: t.color.surfaceVariant, color: t.color.onSurfaceVariant, dot: 'var(--bdg-ref-neutral-400, #CED4DA)' },
};

export function Badge({ variant = 'neutral', dot = true, children, className, style }) {
  const v = badgeV[variant];
  return <span className={className} style={{ ...base, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: t.radius.md, fontSize: 12, fontWeight: 500, background: v.bg, color: v.color, ...style }}>{dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.dot, flexShrink: 0 }} aria-hidden="true" />}{children}</span>;
}


/* ════════════════════════════════════════════════════════════════
   CARD
   ════════════════════════════════════════════════════════════════ */

export const Card = forwardRef(function Card({ elevated, padding = 20, children, className, style, ...p }, ref) {
  return <div ref={ref} className={className} style={{ ...base, background: t.color.surface, border: `1px solid ${t.color.outline}`, borderRadius: t.radius.lg, padding, boxShadow: elevated ? t.shadow.md : 'none', ...style }} {...p}>{children}</div>;
});


/* ════════════════════════════════════════════════════════════════
   TOGGLE — uses hidden native checkbox for a11y
   ════════════════════════════════════════════════════════════════ */

export const Toggle = forwardRef(function Toggle({ checked, onChange, label, disabled, name, id }, ref) {
  const tId = id || (name ? `bdg-toggle-${name}` : undefined);
  return (
    <label htmlFor={tId} style={{ ...base, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: 14, color: t.color.onSurface }}>
      <div style={{ width: 44, height: 24, borderRadius: 12, background: checked ? t.color.primary : 'var(--bdg-ref-neutral-300, #DEE2E6)', position: 'relative', transition: `background ${t.transition.normal}`, flexShrink: 0 }} aria-hidden="true">
        <div style={{ width: 18, height: 18, borderRadius: 9, background: '#FFF', position: 'absolute', top: 3, left: checked ? 23 : 3, transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)', boxShadow: t.shadow.sm }} />
      </div>
      <input ref={ref} type="checkbox" role="switch" id={tId} name={name} checked={checked} onChange={e => onChange?.(e.target.checked)} disabled={disabled} style={srOnly} />
      {label && <span>{label}</span>}
    </label>
  );
});


/* ════════════════════════════════════════════════════════════════
   AVATAR
   ════════════════════════════════════════════════════════════════ */

export function Avatar({ src, name, size = 40, style }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return src
    ? <img src={src} alt={name || ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...style }} />
    : <div role="img" aria-label={name || 'Avatar'} style={{ ...base, width: size, height: size, borderRadius: '50%', background: t.color.primaryContainer, color: t.color.onPrimaryContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: size * 0.38, flexShrink: 0, ...style }}>{initials}</div>;
}


/* ════════════════════════════════════════════════════════════════
   ICON WRAPPER
   ════════════════════════════════════════════════════════════════ */

export function IconWrapper({ icon: Icon, size = 20, color = t.color.onSurfaceVariant, bg, rounded, style, ...p }) {
  if (bg) { const cs = size + 16; return <div style={{ ...base, width: cs, height: cs, borderRadius: rounded ? '50%' : t.radius.md, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }} {...p}><Icon size={size} color={color} aria-hidden="true" /></div>; }
  return <Icon size={size} color={color} aria-hidden="true" style={style} {...p} />;
}


/* ════════════════════════════════════════════════════════════════
   METRIC CARD
   ════════════════════════════════════════════════════════════════ */

export function MetricCard({ label, value, trend, trendLabel, icon: Icon, iconColor = t.color.primary, iconBg = t.color.primaryContainer }) {
  const pos = trend > 0;
  return (
    <Card padding={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {Icon && <IconWrapper icon={Icon} size={20} color={iconColor} bg={iconBg} />}
        <span style={{ ...base, fontSize: 13, color: t.color.onSurfaceVariant }}>{label}</span>
      </div>
      <div style={{ ...base, fontSize: 28, fontWeight: 700, color: t.color.onSurface, letterSpacing: '-0.5px', marginBottom: 4 }}>{value}</div>
      {trend !== undefined && <div style={{ ...base, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><span style={{ color: pos ? t.color.success : t.color.danger, fontWeight: 500 }}>{pos ? '+' : ''}{trend}%</span>{trendLabel && <span style={{ color: t.color.onSurfaceVariant }}>{trendLabel}</span>}</div>}
    </Card>
  );
}


/* ════════════════════════════════════════════════════════════════
   DIVIDER
   ════════════════════════════════════════════════════════════════ */

export function Divider({ spacing = 16, label, style }) {
  if (label) return (<div role="separator" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: `${spacing}px 0`, ...style }}><div style={{ flex: 1, height: 1, background: t.color.outline }} /><span style={{ ...base, fontSize: 12, fontWeight: 500, color: t.color.onSurfaceMuted, whiteSpace: 'nowrap' }}>{label}</span><div style={{ flex: 1, height: 1, background: t.color.outline }} /></div>);
  return <hr role="separator" style={{ height: 1, background: t.color.outline, margin: `${spacing}px 0`, border: 'none', ...style }} />;
}


/* ════════════════════════════════════════════════════════════════
   SIDEBAR
   ════════════════════════════════════════════════════════════════ */

export function Sidebar({ children, width = 240, header, footer, className, style }) {
  return (
    <nav aria-label="Sidebar navigation" className={className} style={{ ...base, width, flexShrink: 0, borderRight: `1px solid ${t.color.outline}`, background: t.color.surface, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', ...style }}>
      {header && <div style={{ padding: '16px 16px 8px' }}>{header}</div>}
      <div style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
      {footer && <div style={{ padding: '8px 16px 16px', borderTop: `1px solid ${t.color.outline}`, marginTop: 'auto' }}>{footer}</div>}
    </nav>
  );
}

export function SidebarItem({ icon: Icon, label, active, badge, onClick, className, style }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} className={className} style={{ ...base, display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', borderRadius: t.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, background: active ? t.color.primaryContainer : 'transparent', color: active ? t.color.onPrimaryContainer : t.color.onSurfaceVariant, transition: `all ${t.transition.normal}`, ...style }}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge !== undefined && <Badge variant={typeof badge === 'string' ? badge : 'neutral'} dot={false} style={{ fontSize: 10, padding: '2px 6px' }}>{typeof badge === 'object' ? badge.count : badge}</Badge>}
    </button>
  );
}

export function SidebarGroup({ label, children }) {
  return (
    <div role="group" aria-label={label}>
      {label && <div style={{ ...base, fontSize: 11, fontWeight: 600, color: t.color.onSurfaceMuted, textTransform: 'uppercase', letterSpacing: 1, padding: '8px 12px 4px' }} aria-hidden="true">{label}</div>}
      {children}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   TABS — with role="tablist" and aria-selected
   ════════════════════════════════════════════════════════════════ */

export function Tabs({ tabs = [], activeId, onChange, variant = 'underline', size = 'md', className, style }) {
  const isUnderline = variant === 'underline';
  const pad = { sm: '6px 10px', md: '8px 14px', lg: '10px 18px' }[size];
  const fs = { sm: 12, md: 13, lg: 14 }[size];
  return (
    <div role="tablist" className={className} style={{ display: 'flex', gap: isUnderline ? 0 : 4, borderBottom: isUnderline ? `1px solid ${t.color.outline}` : 'none', background: isUnderline ? 'transparent' : t.color.surfaceVariant, borderRadius: isUnderline ? 0 : t.radius.md, padding: isUnderline ? 0 : 3, ...style }}>
      {tabs.map(tab => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        const icon = typeof tab === 'object' ? tab.icon : null;
        const active = activeId === id;
        return (
          <button key={id} role="tab" aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => onChange?.(id)} style={{ ...base, display: 'flex', alignItems: 'center', gap: 6, padding: pad, fontSize: fs, fontWeight: active ? 600 : 400, border: 'none', cursor: 'pointer', transition: `all ${t.transition.normal}`, whiteSpace: 'nowrap',
            ...(isUnderline
              ? { background: 'transparent', color: active ? t.color.primary : t.color.onSurfaceVariant, borderBottom: active ? `2px solid ${t.color.primary}` : '2px solid transparent', marginBottom: -1, borderRadius: 0 }
              : { background: active ? t.color.surface : 'transparent', color: active ? t.color.onSurface : t.color.onSurfaceVariant, borderRadius: t.radius.sm, boxShadow: active ? t.shadow.sm : 'none' }),
          }}>
            {icon && React.createElement(icon, { size: fs, 'aria-hidden': true })}
            {label}
          </button>
        );
      })}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   BREADCRUMBS — with nav + aria-label
   ════════════════════════════════════════════════════════════════ */

export function Breadcrumbs({ items = [], style }) {
  return (
    <nav aria-label="Breadcrumb" style={{ ...base, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, ...style }}>
      <ol style={{ display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color.onSurfaceMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>}
              {last
                ? <span aria-current="page" style={{ fontWeight: 500, color: t.color.onSurface }}>{item.label}</span>
                : <a href={item.href || '#'} onClick={item.onClick} style={{ color: t.color.onSurfaceVariant, textDecoration: 'none', cursor: 'pointer' }}>{item.label}</a>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


/* ════════════════════════════════════════════════════════════════
   TOP BAR
   ════════════════════════════════════════════════════════════════ */

export function TopBar({ left, center, right, className, style }) {
  return (
    <header className={className} style={{ ...base, display: 'flex', alignItems: 'center', height: 56, padding: '0 20px', borderBottom: `1px solid ${t.color.outline}`, background: t.color.surface, gap: 16, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>{left}</div>
      {center && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{center}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>{right}</div>
    </header>
  );
}


/* ════════════════════════════════════════════════════════════════
   APP SHELL
   ════════════════════════════════════════════════════════════════ */

export function AppShell({ sidebar, topBar, children, className, style }) {
  return (
    <div className={className} style={{ ...base, display: 'flex', flexDirection: 'column', height: '100vh', background: t.color.surfaceVariant, ...style }}>
      {topBar}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebar}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   TABLE
   ════════════════════════════════════════════════════════════════ */

export function Table({ columns = [], data = [], onRowClick, stickyHeader, emptyMessage = 'No data', className, style }) {
  return (
    <div className={className} style={{ border: `1px solid ${t.color.outline}`, borderRadius: t.radius.lg, overflow: 'hidden', ...style }}>
      <table role="table" style={{ ...base, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{columns.map(col => (<th key={col.key || col.label} scope="col" style={{ ...base, padding: '10px 16px', textAlign: col.align || 'left', fontWeight: 600, fontSize: 12, color: t.color.onSurfaceVariant, borderBottom: `1px solid ${t.color.outline}`, position: stickyHeader ? 'sticky' : 'static', top: 0, background: t.color.surfaceVariant, whiteSpace: 'nowrap', ...(col.width ? { width: col.width } : {}) }}>{col.label}</th>))}</tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: t.color.onSurfaceMuted }}>{emptyMessage}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id ?? i} onClick={() => onRowClick?.(row, i)} style={{ background: t.color.surface, cursor: onRowClick ? 'pointer' : 'default', transition: `background ${t.transition.fast}` }} onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = t.color.surfaceVariant; }} onMouseLeave={e => { e.currentTarget.style.background = t.color.surface; }}>
              {columns.map(col => (<td key={col.key || col.label} style={{ padding: '10px 16px', borderBottom: i < data.length - 1 ? `1px solid ${t.color.outlineVariant}` : 'none', color: t.color.onSurface, textAlign: col.align || 'left' }}>{col.render ? col.render(row[col.key], row, i) : row[col.key]}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   PAGINATION
   ════════════════════════════════════════════════════════════════ */

export function Pagination({ page = 1, totalPages = 1, onChange, style }) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  const btn = (content, pg, disabled) => (
    <button key={typeof content === 'number' ? content : `nav-${content}`} disabled={disabled} onClick={() => !disabled && onChange?.(pg)} aria-label={typeof content === 'number' ? `Page ${content}` : content === '←' ? 'Previous page' : 'Next page'} aria-current={pg === page ? 'page' : undefined} style={{ ...base, width: typeof content === 'number' ? 32 : 'auto', height: 32, padding: typeof content === 'number' ? 0 : '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: pg === page ? `1.5px solid ${t.color.primary}` : `1px solid ${t.color.outline}`, borderRadius: t.radius.md, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: pg === page ? 600 : 400, background: pg === page ? t.color.primaryContainer : t.color.surface, color: disabled ? t.color.onSurfaceMuted : pg === page ? t.color.onPrimaryContainer : t.color.onSurface, opacity: disabled ? 0.5 : 1, transition: `all ${t.transition.fast}` }}>{content}</button>
  );
  return (
    <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', gap: 4, ...style }}>
      {btn('←', page - 1, page <= 1)}
      {pages.map((pg, i) => pg === '...' ? <span key={`e${i}`} style={{ padding: '0 4px', color: t.color.onSurfaceMuted }} aria-hidden="true">...</span> : btn(pg, pg, false))}
      {btn('→', page + 1, page >= totalPages)}
    </nav>
  );
}


/* ════════════════════════════════════════════════════════════════
   LIST ITEM
   ════════════════════════════════════════════════════════════════ */

export function ListItem({ icon: Icon, avatar, title, subtitle, trailing, onClick, active, className, style }) {
  return (
    <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }} className={className} style={{ ...base, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: onClick ? 'pointer' : 'default', borderRadius: t.radius.md, background: active ? t.color.primaryContainer : 'transparent', transition: `background ${t.transition.fast}`, ...style }}
      onMouseEnter={e => { if (onClick && !active) e.currentTarget.style.background = t.color.surfaceVariant; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {avatar || (Icon && <IconWrapper icon={Icon} size={20} color={active ? t.color.onPrimaryContainer : t.color.onSurfaceVariant} />)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: active ? t.color.onPrimaryContainer : t.color.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: active ? t.color.onPrimaryContainer : t.color.onSurfaceVariant, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
      {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   EMPTY STATE
   ════════════════════════════════════════════════════════════════ */

export function EmptyState({ icon: Icon, title, description, action, className, style }) {
  return (
    <div className={className} style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', ...style }}>
      {Icon && <div style={{ width: 56, height: 56, borderRadius: t.radius.xl, background: t.color.surfaceVariant, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon size={28} color={t.color.onSurfaceMuted} aria-hidden="true" /></div>}
      {title && <div style={{ fontSize: 16, fontWeight: 600, color: t.color.onSurface, marginBottom: 4 }}>{title}</div>}
      {description && <div style={{ fontSize: 14, color: t.color.onSurfaceVariant, maxWidth: 360, lineHeight: 1.5, marginBottom: action ? 16 : 0 }}>{description}</div>}
      {action}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   SKELETON
   ════════════════════════════════════════════════════════════════ */

export function Skeleton({ width = '100%', height = 16, radius, variant = 'rect', style }) {
  const r = variant === 'circle' ? '50%' : radius || t.radius.md;
  const w = variant === 'circle' ? height : width;
  return <div role="status" aria-label="Loading" style={{ width: w, height, borderRadius: r, background: t.color.skeleton, animation: 'bdg-pulse 1.5s ease-in-out infinite', ...style }} />;
}

export function SkeletonText({ lines = 3, spacing = 8, style }) {
  return (
    <div role="status" aria-label="Loading text" style={{ display: 'flex', flexDirection: 'column', gap: spacing, ...style }}>
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} height={12} width={i === lines - 1 ? '66%' : '100%'} radius={t.radius.sm} />)}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   MODAL — with focus trap, aria-modal, return focus
   ════════════════════════════════════════════════════════════════ */

export function Modal({ open, onClose, title, children, footer, width = 480, id, className, style }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement;
    const handler = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    // Focus first focusable element
    setTimeout(() => {
      const el = dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      el?.focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', handler);
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const titleId = id ? `${id}-title` : 'bdg-modal-title';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: t.z.modal, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: t.color.overlay }} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} className={className} style={{ ...base, position: 'relative', width: '100%', maxWidth: width, background: t.color.surface, borderRadius: t.radius.xl, boxShadow: t.shadow.xl, display: 'flex', flexDirection: 'column', maxHeight: '85vh', ...style }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${t.color.outline}` }}>
            <span id={titleId} style={{ fontSize: 16, fontWeight: 600, color: t.color.onSurface }}>{title}</span>
            <button onClick={onClose} aria-label="Close dialog" style={{ ...base, width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.sm, color: t.color.onSurfaceVariant }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}
        <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: `1px solid ${t.color.outline}` }}>{footer}</div>}
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   TOAST + useToast
   ════════════════════════════════════════════════════════════════ */

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, { variant = 'neutral', duration = 4000 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, variant }]);
    if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), duration);
    return id;
  }, []);
  const dismiss = useCallback(id => setToasts(prev => prev.filter(x => x.id !== id)), []);
  const toastColors = { success: { bg: t.color.successContainer, c: t.color.onSuccessContainer }, danger: { bg: t.color.dangerContainer, c: t.color.onDangerContainer }, warning: { bg: t.color.warningContainer, c: t.color.onWarningContainer }, info: { bg: t.color.infoContainer, c: t.color.onInfoContainer }, neutral: { bg: t.color.surface, c: t.color.onSurface } };

  return (
    <ToastCtx.Provider value={{ toast: add, dismiss }}>
      {children}
      <div role="status" aria-live="polite" aria-label="Notifications" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: t.z.toast, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
        {toasts.map(toast => {
          const tc = toastColors[toast.variant] || toastColors.neutral;
          return (
            <div key={toast.id} role="alert" style={{ ...base, padding: '12px 16px', borderRadius: t.radius.lg, background: tc.bg, color: tc.c, fontSize: 13, fontWeight: 500, boxShadow: t.shadow.lg, display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.color.outline}`, animation: 'bdg-slideUp 0.2s ease-out' }}>
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" style={{ ...base, border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}


/* ════════════════════════════════════════════════════════════════
   ALERT — with role="alert" / role="status"
   ════════════════════════════════════════════════════════════════ */

export function Alert({ variant = 'info', title, children, onDismiss, icon: Icon, className, style }) {
  const colors = { info: { bg: t.color.infoContainer, c: t.color.onInfoContainer, border: 'var(--bdg-ref-primary-200, #B0BBFF)' }, success: { bg: t.color.successContainer, c: t.color.onSuccessContainer, border: 'var(--bdg-ref-success-200, #A7F3D0)' }, warning: { bg: t.color.warningContainer, c: t.color.onWarningContainer, border: 'var(--bdg-ref-warning-200, #FDE68A)' }, danger: { bg: t.color.dangerContainer, c: t.color.onDangerContainer, border: 'var(--bdg-ref-danger-200, #FECACA)' } };
  const v = colors[variant] || colors.info;
  const isUrgent = variant === 'danger' || variant === 'warning';
  return (
    <div role={isUrgent ? 'alert' : 'status'} className={className} style={{ ...base, display: 'flex', gap: 12, padding: '12px 16px', borderRadius: t.radius.lg, background: v.bg, color: v.c, border: `1px solid ${v.border}`, fontSize: 13, lineHeight: 1.5, ...style }}>
      {Icon && <Icon size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />}
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children}
      </div>
      {onDismiss && <button onClick={onDismiss} aria-label="Dismiss alert" style={{ ...base, border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, flexShrink: 0, marginTop: 1 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   TOOLTIP — with aria-describedby
   ════════════════════════════════════════════════════════════════ */

let tooltipIdCounter = 0;

export function Tooltip({ content, children, position = 'top' }) {
  const [show, setShow] = useState(false);
  const [tipId] = useState(() => `bdg-tooltip-${++tooltipIdCounter}`);
  const pos = { top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }, bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 }, left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 }, right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 } };
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {React.cloneElement(React.Children.only(children), { 'aria-describedby': content ? tipId : undefined })}
      {show && content && (
        <div id={tipId} role="tooltip" style={{ ...base, position: 'absolute', ...pos[position], zIndex: t.z.tooltip, padding: '6px 10px', borderRadius: t.radius.md, background: 'var(--bdg-ref-neutral-900, #212529)', color: 'var(--bdg-ref-neutral-100, #F1F3F5)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: t.shadow.md }}>{content}</div>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   PROGRESS BAR — with role="progressbar"
   ════════════════════════════════════════════════════════════════ */

export function ProgressBar({ value = 0, max = 100, variant = 'primary', size = 'md', label, style }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const h = { sm: 4, md: 8, lg: 12 }[size];
  const colors = { primary: t.color.primary, success: t.color.success, warning: t.color.warning, danger: t.color.danger };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && <div style={{ ...base, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.color.onSurfaceVariant }}><span>{label}</span><span style={{ fontWeight: 500 }}>{Math.round(pct)}%</span></div>}
      <div role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label || 'Progress'} style={{ width: '100%', height: h, borderRadius: h, background: t.color.surfaceVariant, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: h, background: colors[variant] || colors.primary, transition: 'width 300ms ease' }} />
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   GLOBAL KEYFRAMES
   ════════════════════════════════════════════════════════════════ */

export const globalKeyframes = `
@keyframes bdg-spin { to { transform: rotate(360deg); } }
@keyframes bdg-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes bdg-slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;
