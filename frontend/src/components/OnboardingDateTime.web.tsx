import { useId } from 'react';
import type { DateTimeProps } from './OnboardingDateTime';
import { theme } from '../theme';

export function OnboardingDateTime({ label, hint, value, type, onChange }: DateTimeProps) {
  const id = useId();
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <label htmlFor={id} style={{ color: theme.colors.text, fontSize: 17, fontWeight: 600 }}>{label}</label>
    <input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} aria-describedby={`${id}-hint`}
      style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 56, padding: 16, font: 'inherit', fontSize: 18, color: theme.colors.text, borderRadius: 16, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface }} />
    <span id={`${id}-hint`} style={{ color: theme.colors.muted, fontSize: 15, lineHeight: '23px' }}>{hint}</span>
  </div>;
}
