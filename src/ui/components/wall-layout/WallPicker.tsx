import { Plus } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { Button } from '../shared/ui';

/** Açık işin duvarları arasında geçiş ve yeni duvar. */
export default function WallPicker({ activeId }: { activeId: string | undefined }) {
  const spaces = useProjectStore((s) => s.project?.spaces ?? []);
  const activeJobId = useProjectStore((s) => s.activeJobId);
  const setActiveWall = useProjectStore((s) => s.setActiveWall);
  const setActiveSpace = useProjectStore((s) => s.setActiveSpace);
  const addWall = useProjectStore((s) => s.addWall);
  const activeSpaceId = useProjectStore((s) => s.activeSpaceId);

  const jobSpaces = spaces.filter((s) => s.jobId === activeJobId);
  const options = jobSpaces.flatMap((s) => s.walls.map((w) => ({
    spaceId: s.id, wallId: w.id, label: jobSpaces.length > 1 ? `${s.name} · ${w.name}` : w.name,
  })));

  return (
    <div className="flex gap-2 items-end">
      <label className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-xs text-[var(--color-text-muted)]">Duvar</span>
        <select value={activeId ?? ''} onChange={(e) => {
          const o = options.find((x) => x.wallId === e.target.value);
          if (o) { setActiveSpace(o.spaceId); setActiveWall(o.wallId); }
        }}
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm focus:border-[var(--color-border-focus)] focus:outline-none">
          {options.map((o) => <option key={o.wallId} value={o.wallId}>{o.label}</option>)}
        </select>
      </label>
      <Button size="sm" onClick={() => addWall(jobSpaces.some((s) => s.id === activeSpaceId) ? activeSpaceId : null)}
        title="Bu işe yeni duvar ekle (L ya da U dolap için)"><Plus size={14} /> Yeni duvar</Button>
    </div>
  );
}
