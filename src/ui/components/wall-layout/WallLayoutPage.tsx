import { ArrowLeft, Plus, MapPin } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { useActiveWall, useProjectStore } from '../../../stores/project-store';
import WallMeasurementForm from './WallMeasurementForm';
import ObstacleEditor from './ObstacleEditor';
import WallPlanPanel from './WallPlanPanel';
import WallLayoutView from './WallLayoutView';
import WallPicker from './WallPicker';
import { Button, EmptyState } from '../shared/ui';

/** Mutfak işi, 1. adım: duvar ölçüsü, cihazlar ve otomatik alt/üst dolap önerisi. */
export default function WallLayoutPage() {
  const setActivePage = useUIStore((s) => s.setActivePage);
  const addWall = useProjectStore((s) => s.addWall);
  const wall = useActiveWall();

  if (!wall) {
    return (
      <EmptyState icon={<MapPin size={32} />} title="Henüz duvar yok"
        text="Mutfağın duvar ölçüsünü girin; program alt ve üst dolapları otomatik yerleştirir. L ya da U mutfakta her duvarı ayrı ekleyin."
        action={<Button variant="primary" onClick={() => addWall(null)}><Plus size={15} /> Duvar ekle</Button>} />
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
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <WallLayoutView wall={wall} />
      </div>
    </div>
  );
}
