import { BOX_CONTENTS } from '../../../core/layout/composition';
import type { BoxContent } from '../../../core/layout/composition';

/** Kutu içeriği seçici (kapaklı, çekmeceli, açık raf…); duvar dolabı ve mutfakta ortak. */
export default function ContentPicker({ value, onChange }: { value: BoxContent; onChange: (v: BoxContent) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Kutu içeriği">
      {BOX_CONTENTS.map((c) => (
        <button key={c.value} role="radio" aria-checked={value === c.value} title={c.hint} onClick={() => onChange(c.value)}
          className={`px-2 py-1.5 rounded-md text-xs font-medium border text-left transition-colors ${
            value === c.value
              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
              : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
          }`}>{c.label}</button>
      ))}
    </div>
  );
}
