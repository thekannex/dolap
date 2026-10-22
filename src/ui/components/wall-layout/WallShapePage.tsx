import { ArrowLeft, Plus, Box } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { useActiveWall, useProjectStore } from '../../../stores/project-store';
import WallSummary from '../wall-survey/WallSummary';
import WallChangeNotice from '../wall-survey/WallChangeNotice';
import ObstacleEditor from './ObstacleEditor';
import WallPicker from './WallPicker';
import WallShape3D from './WallShape3D';
import { Button, EmptyState } from '../shared/ui';

/** Duvar dolabı işi, 2. adım: duvar şekli (3B: kolon, kiriş, çıkıntı) ve dolap alanı. */
export default function WallShapePage() {
  const setActivePage = useUIStore((s) => s.setActivePage);
  const addWall = useProjectStore((s) => s.addWall);
  const wall = useActiveWall();

  if (!wall) {
    return (
      <EmptyState icon={<Box size={32} />} title="Henüz duvar yok"
        text="Dolabın oturacağı duvarın ölçüsünü girin; ardından kolon, kiriş ve çıkıntıları ekleyip dolap alanını çizin."
        action={<Button variant="primary" onClick={() => addWall(null)}><Plus size={15} /> Duvar ekle</Button>} />
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-72 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setActivePage('project')}>
          <ArrowLeft size={14} /> Projeye dön
        </Button>
        <WallPicker activeId={wall.id} />
        <WallSummary wall={wall} />
        <ObstacleEditor wall={wall} />
      </aside>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <WallChangeNotice wall={wall} />
        <WallShape3D key={wall.id} wall={wall} />
      </div>
    </div>
  );
}
