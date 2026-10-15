import { ArrowLeft } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { useActiveWall } from '../../../stores/project-store';
import WallMeasurementForm from './WallMeasurementForm';
import ObstacleEditor from './ObstacleEditor';
import WallPlanPanel from './WallPlanPanel';
import WallLayoutView from './WallLayoutView';
import { Button, EmptyState } from '../shared/ui';

export default function WallLayoutPage() {
  const setActivePage = useUIStore((s) => s.setActivePage);
  const wall = useActiveWall();

  if (!wall) {
    return (
      <EmptyState title="Duvar seçilmedi" text="Proje sayfasından bir duvar seçin ya da yeni duvar ekleyin."
        action={<Button variant="primary" onClick={() => setActivePage('project')}>Projeye git</Button>} />
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-80 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setActivePage('project')}>
          <ArrowLeft size={14} /> Projeye dön
        </Button>
        <WallMeasurementForm wall={wall} />
        <WallPlanPanel wall={wall} />
        <ObstacleEditor wall={wall} />
      </aside>
      <WallLayoutView wall={wall} />
    </div>
  );
}
