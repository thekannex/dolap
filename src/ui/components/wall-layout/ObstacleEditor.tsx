import { Trash2 } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import type { Wall } from '../../../core/models/project';
import { NumInput } from '../shared/ui';
import { OBSTACLE_TYPES, obstacleInfo } from './obstacle-types';
import { defaultShape, WALL_SHAPE_TYPES } from '../../../core/layout/wall-fit';

export default function ObstacleEditor({ wall }: { wall: Wall }) {
  const addObstacle = useProjectStore((s) => s.addObstacle);
  const updateObstacle = useProjectStore((s) => s.updateObstacle);
  const removeObstacle = useProjectStore((s) => s.removeObstacle);

  const handleAdd = (type: string) => {
    if (WALL_SHAPE_TYPES.has(type)) {
      addObstacle(wall.id, { wallId: wall.id, type, ...defaultShape(type, wall) });
      return;
    }
    const [width, y, height] = obstacleInfo(type).size;
    addObstacle(wall.id, { wallId: wall.id, type, x: 0, y, width, height, depth: type === 'pipe' ? 60 : 0 });
  };

  return (
    <details open={wall.obstacles.length > 0} className="border border-[var(--color-border)] rounded-lg">
      <summary className="px-3 py-2.5 cursor-pointer text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
        Duvar şekli, engeller ve cihazlar ({wall.obstacles.length})
      </summary>
      <div className="px-3 pb-3 flex flex-col gap-2">
        <p className="text-[11px] text-[var(--color-text-dim)]">
          Kolon, kiriş, çıkıntı ve girinti duvarın şeklidir; "Derinlik" duvardan odaya ne kadar taştığıdır (girintide duvarın içine). "Duvar şekli (3D)" sekmesinde sürükleyerek de yerleştirilir. "Cihaz boşluğu" otomatik yerleşimde boş bırakılır. Ölçüler duvarın sol alt köşesinden mm.
        </p>
        <div className="flex flex-wrap gap-1">
          {OBSTACLE_TYPES.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => handleAdd(value)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {wall.obstacles.map((obs) => {
          const info = obstacleInfo(obs.type);
          return (
            <div key={obs.id} className="rounded-md bg-[var(--color-bg)] p-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <info.icon size={14} className="text-[var(--color-text-dim)]" />
                <span className="text-xs font-medium flex-1">{info.label}</span>
                <button onClick={() => removeObstacle(wall.id, obs.id)} aria-label="Engeli sil"
                  className="text-[var(--color-text-dim)] hover:text-[var(--color-error)]"><Trash2 size={13} /></button>
              </div>
              <div className={`grid gap-1 ${info.shape || obs.type === 'pipe' || obs.type === 'custom' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <NumInput label="Soldan" value={obs.x} onChange={(v) => updateObstacle(wall.id, obs.id, { x: v })} max={20000} suffix="" />
                <NumInput label="Yerden" value={obs.y} onChange={(v) => updateObstacle(wall.id, obs.id, { y: v })} max={6000} suffix="" />
                <NumInput label="En" value={obs.width} onChange={(v) => updateObstacle(wall.id, obs.id, { width: v })} min={1} max={20000} suffix="" />
                <NumInput label="Boy" value={obs.height} onChange={(v) => updateObstacle(wall.id, obs.id, { height: v })} min={1} max={6000} suffix="" />
                {(info.shape || obs.type === 'pipe' || obs.type === 'custom') && (
                  <NumInput label="Derinlik" value={obs.depth} onChange={(v) => updateObstacle(wall.id, obs.id, { depth: v })} max={3000} suffix="" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
