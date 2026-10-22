import { ArrowLeft, Plus, MapPin } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { useActiveWall, useProjectStore } from '../../../stores/project-store';
import WallSummary from '../wall-survey/WallSummary';
import WallChangeNotice from '../wall-survey/WallChangeNotice';
import ObstacleEditor from './ObstacleEditor';
import WallPlanPanel from './WallPlanPanel';
import WallLayoutView from './WallLayoutView';
import WallPicker from './WallPicker';
import { Button, EmptyState } from '../shared/ui';

/** Mutfak işi, 2. adım: cihazlar ve otomatik alt/üst dolap önerisi (duvar ölçüsü 1. adımda). */
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
        <WallSummary wall={wall} />
        <WallPlanPanel wall={wall} />
        <ObstacleEditor wall={wall} />
      </aside>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <WallChangeNotice wall={wall} />
        <WallLayoutView wall={wall} />
      </div>
    </div>
  );
}
