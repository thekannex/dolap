import { useState } from 'react';
import type { ReactNode, ComponentProps } from 'react';

const parse = (raw: string) => (raw.trim() === '' ? NaN : Number(raw.replace(',', '.')));

const inputCls =
  'w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm text-[var(--color-text)] ' +
  'focus:border-[var(--color-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15 transition-colors';

export function NumInput({ label, value, onChange, min = 0, max = 100000, step = 1, suffix = 'mm', hint }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; hint?: string;
}) {
  const [text, setText] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  // Dışarıdan gelen değişikliği yansıt; yazılmakta olan "1." gibi ara metni bozma.
  if (value !== prevValue) {
    setPrevValue(value);
    if (parse(text) !== value) setText(String(value));
  }

  // Yazarken yalnızca aralık içindeki değerleri uygula; aralık dışını odaktan çıkınca sınırla.
  const commit = (raw: string) => {
    const n = parse(raw);
    if (!Number.isNaN(n) && n >= min && n <= max && n !== value) onChange(n);
  };
  const finish = () => {
    const n = parse(text);
    if (Number.isNaN(n)) { setText(String(value)); return; }
    const clamped = Math.min(max, Math.max(min, n));
    if (clamped !== value) onChange(clamped);
    setText(String(clamped));
  };

  const parsed = parse(text);
  const invalid = Number.isNaN(parsed) || parsed < min || parsed > max;

  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-[var(--color-text-muted)] truncate" title={hint ?? label}>{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text" inputMode="decimal" value={text}
          onChange={(e) => { setText(e.target.value); commit(e.target.value); }}
          onBlur={finish}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const next = Math.min(max, Math.max(min, value + (e.key === 'ArrowUp' ? step : -step)));
              onChange(Math.round(next * 100) / 100);
            }
          }}
          aria-invalid={invalid}
          title={invalid ? `${min} – ${max} arası bir değer girin` : undefined}
          className={`${inputCls} font-mono ${invalid ? '!border-[var(--color-error)]' : ''}`}
        />
        {suffix && <span className="text-xs text-[var(--color-text-dim)] min-w-6">{suffix}</span>}
      </div>
    </label>
  );
}

export function TextInput({ label, value, onChange, placeholder, multiline, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      {multiline ? (
        <textarea value={value} placeholder={placeholder} rows={3} onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y`} />
      ) : (
        <input value={value} placeholder={placeholder} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </label>
  );
}

export function SelectInput<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--color-accent)] w-4 h-4" />
      {label}
    </label>
  );
}

export function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] py-2 border-b border-[var(--color-border)] list-none">
        {title}
        <span className="text-[var(--color-text-dim)] group-open:rotate-90 transition-transform text-[10px]">▶</span>
      </summary>
      <div className="py-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...rest }: ComponentProps<'button'> & {
  variant?: Variant; size?: 'sm' | 'md';
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40';
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3 py-1.5 text-sm' };
  const variants: Record<Variant, string> = {
    primary: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
    secondary: 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]',
    ghost: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]',
    danger: 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10',
  };
  return <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>{children}</button>;
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border)] overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
          <h3 className="font-semibold text-sm text-[var(--color-text)]">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm flex flex-col items-center gap-3">
        {icon && <div className="text-[var(--color-text-dim)]">{icon}</div>}
        <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
        {text && <p className="text-sm text-[var(--color-text-muted)]">{text}</p>}
        {action}
      </div>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'accent' | 'warning' }) {
  const color = tone === 'accent' ? 'text-[var(--color-accent)]' : tone === 'warning' ? 'text-[var(--color-warning)]' : 'text-[var(--color-text)]';
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-dim)]">{label}</p>
      <p className={`text-xl font-semibold font-mono mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
