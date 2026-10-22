import { useMemo } from 'react';
import { AlertTriangle, RefreshCw, Check, ArrowRight } from 'lucide-react';
import type { Wall } from '../../../core/models/project';
import { fittedChanged, kitchenWallStatus } from '../../../core/layout/wall-changes';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { Button } from '../shared/ui';

/**
 * Duvar ölçüsü ya da engeller dolaplar kurulduktan sonra değiştiyse (ya da dolaplar artık sığmıyorsa) uyarır ve
 * yeniden hesaplamayı ya da olduğu gibi bırakmayı önerir. Engeller her zaman sonradan da eklenebilir.
 */
export default function WallChangeNotice({ wall }: { wall: Wall }) {
  const project = useProjectStore((s) => s.project);
  const acknowledgeWallChange = useProjectStore((s) => s.acknowledgeWallChange);
  const acknowledgeFitChange = useProjectStore((s) => s.acknowledgeFitChange);
  const refitComposition = useProjectStore((s) => s.refitComposition);
  const activePage = useUIStore((s) => s.activePage);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const confirm = useUIStore((s) => s.confirm);
  const notify = useUIStore((s) => s.notify);

  const kitchen = useMemo(() => (project ? kitchenWallStatus(wall, project.cabinets) : null), [project, wall]);
  const fitted = useMemo(() => project?.compositions.filter((c) => c.wallId === wall.id && fittedChanged(c, wall)) ?? [], [project, wall]);
  if (!kitchen || (!kitchen.changed && kitchen.conflicts.length === 0 && fitted.length === 0)) return null;

  return (
    <div role="alert" className="shrink-0 m-3 mb-0 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/8 px-4 py-3 flex flex-col gap-2 text-sm">
      {(kitchen.changed || kitchen.conflicts.length > 0) && (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-[var(--color-warning)] shrink-0" />
            {kitchen.changed ? 'Duvar ölçüsü ya da engeller, dolaplar yerleştirildikten sonra değişti.' : 'Bazı dolaplar duvara uymuyor.'}
          </p>
          {kitchen.conflicts.length > 0 && (
            <ul className="text-xs text-[var(--color-text-muted)] pl-6 list-disc">
              {kitchen.conflicts.slice(0, 6).map((c, i) => <li key={i}><b className="font-mono">{c.code}</b> {c.reason}</li>)}
              {kitchen.conflicts.length > 6 && <li>ve {kitchen.conflicts.length - 6} uyarı daha</li>}
            </ul>
          )}
          <p className="text-xs text-[var(--color-text-muted)] pl-6">
            Yerleşim adımında "Öneriyi uygula" ile dolapları yeni duruma göre yeniden dizebilir ya da dolapları tek tek düzeltebilirsiniz.
          </p>
          <div className="flex gap-2 pl-6">
            {activePage !== 'wall-layout' && (
              <Button size="sm" variant="primary" onClick={() => setActivePage('wall-layout')}>Yerleşim adımına git <ArrowRight size={13} /></Button>
            )}
            {kitchen.changed && (
              <Button size="sm" onClick={() => acknowledgeWallChange(wall.id)}><Check size={13} /> Dolaplar böyle kalsın</Button>
            )}
          </div>
        </div>
      )}
      {fitted.map((c) => (
        <div key={c.id} className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-[var(--color-warning)] shrink-0" />
            "{c.name}" kurulduktan sonra duvar ölçüsü ya da engeller değişti.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] pl-6">
            Dolabı yeni ölçü ve engellere göre yeniden hesaplayabilirsiniz (aynı alan ve modül ayarlarıyla). Kutularda elle yaptığınız değişiklikler silinir.
          </p>
          <div className="flex gap-2 pl-6">
            <Button size="sm" variant="primary" onClick={async () => {
              if (!(await confirm({ title: 'Dolap yeniden hesaplansın mı?', message: `"${c.name}" duvarın güncel ölçü ve engellerine göre yeniden kurulacak; kutularda elle yaptığınız değişiklikler silinir.`, confirmLabel: 'Yeniden hesapla' }))) return;
              const n = refitComposition(c.id);
              notify('success', `"${c.name}" yeniden hesaplandı (${n} kutu).`);
            }}><RefreshCw size={13} /> Dolabı yeniden hesapla</Button>
            <Button size="sm" onClick={() => acknowledgeFitChange(c.id)}><Check size={13} /> Böyle kalsın</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
