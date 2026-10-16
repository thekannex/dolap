import { ArrowLeft, Plus, MapPin } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { useActiveWall, useProjectStore } from '../../../stores/project-store';
import WallMeasurementForm from './WallMeasurementForm';
import ObstacleEditor from './ObstacleEditor';
import WallPlanPanel from './WallPlanPanel';
import WallLayoutView from './WallLayoutView';
import { Button, EmptyState } from '../shared/ui';

function WallPicker({ activeId }: { activeId: string | undefined }) {
  const spaces = useProjectStore((s) => s.project?.spaces ?? []);
  const setActiveWall = useProjectStore((s) => s.setActiveWall);
  const setActiveSpace = useProjectStore((s) => s.setActiveSpace);
  const addWall = useProjectStore((s) => s.addWall);
  const activeSpaceId = useProjectStore((s) => s.activeSpaceId);

  const options = spaces.flatMap((s) => s.walls.map((w) => ({ spaceId: s.id, wallId: w.id, label: `${s.name} · ${w.name}` })));

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
      <Button size="sm" onClick={() => addWall(activeSpaceId)} title="Bu mekâna yeni duvar ekle"><Plus size={14} /> Yeni duvar</Button>
    </div>
  );
}

export default function WallLayoutPage() {
  const setActivePage = useUIStore((s) => s.setActivePage);
  const addWall = useProjectStore((s) => s.addWall);
  const wall = useActiveWall();

  if (!wall) {
    return (
      <EmptyState icon={<MapPin size={32} />} title="Henüz duvar yok"
        text="Mutfak gibi duvara dayalı işlerde duvar ölçüsünü girin; program dolapları otomatik yerleştirir. Bağımsız mobilya için duvar gerekmez."
        action={
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => addWall(null)}><Plus size={15} /> Duvar ekle</Button>
            <Button onClick={() => setActivePage('editor')}>Dolaplara git</Button>
          </div>
        } />
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-80 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setActivePage('project')}>
          <ArrowLeft size={14} /> Projeye dön
        </Button>
        <WallPicker activeId={wall.id} />
        <WallMeasurementForm wall={wall} />
        <WallPlanPanel wall={wall} />
        <ObstacleEditor wall={wall} />
      </aside>
      <WallLayoutView wall={wall} />
    </div>
  );
}
