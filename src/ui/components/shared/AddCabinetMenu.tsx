import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CabinetType } from '../../../core/models/cabinet';
import { CABINET_TYPE_LABELS } from '../../../core/engine/cabinet-factory';
import { Button } from './ui';
import { CABINET_TYPE_ICONS } from './cabinet-icons';

const ORDER: CabinetType[] = ['base', 'drawer_base', 'sink', 'wall', 'open_shelf', 'tall', 'filler'];

export default function AddCabinetMenu({ onAdd, label = 'Dolap ekle', variant = 'primary' }: {
  onAdd: (type: CabinetType) => void; label?: string; variant?: 'primary' | 'secondary';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant={variant} size="sm" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Plus size={14} /> {label}
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 z-40 w-52 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl py-1">
          {ORDER.map((type) => {
            const Icon = CABINET_TYPE_ICONS[type];
            return (
              <button key={type} role="menuitem"
                onClick={() => { onAdd(type); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]/60">
                <Icon size={15} className="text-[var(--color-text-muted)]" /> {CABINET_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
