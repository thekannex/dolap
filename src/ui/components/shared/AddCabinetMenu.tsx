import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CabinetType } from '../../../core/models/cabinet';
import { CABINET_TYPE_LABELS, FURNITURE_TYPES, KITCHEN_TYPES } from '../../../core/engine/cabinet-factory';
import { useProjectStore } from '../../../stores/project-store';
import { Button } from './ui';
import { CABINET_TYPE_ICONS } from './cabinet-icons';

const GROUPS = [
  { title: 'Mutfak', types: KITCHEN_TYPES },
  { title: 'Bağımsız mobilya', types: FURNITURE_TYPES },
];

export default function AddCabinetMenu({ onAdd, label = 'Dolap ekle', variant = 'primary' }: {
  onAdd: (type: CabinetType) => void; label?: string; variant?: 'primary' | 'secondary';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Duvarsız (bağımsız mobilya) projelerde mobilya tipleri önce gelir
  const furnitureFirst = useProjectStore((s) => (s.project?.spaces.length ?? 0) === 0);
  const groups = furnitureFirst ? [...GROUPS].reverse() : GROUPS;

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
        <div role="menu" className="absolute right-0 mt-1 z-40 w-52 max-h-[70vh] overflow-y-auto bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl py-1">
          {groups.map((g) => (
            <div key={g.title} role="group" aria-label={g.title}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">{g.title}</p>
              {g.types.map((type) => {
                const Icon = CABINET_TYPE_ICONS[type];
                return (
                  <button key={type} role="menuitem"
                    onClick={() => { onAdd(type); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]/60">
                    <Icon size={15} className="text-[var(--color-text-muted)]" /> {CABINET_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
