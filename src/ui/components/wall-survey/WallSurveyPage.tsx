import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Ruler } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { useActiveJob, useActiveWall, useProjectStore } from '../../../stores/project-store';
import { analyzeWall, sideObstaclesOnWall, surveyOf } from '../../../core/layout/wall-survey';
import WallPicker from '../wall-layout/WallPicker';
import ObstacleEditor from '../wall-layout/ObstacleEditor';
import { Button, EmptyState, NumInput } from '../shared/ui';
import SurveyForm from './SurveyForm';
import SurveyDrawing from './SurveyDrawing';
import SurveyResults from './SurveyResults';
import WallChangeNotice from './WallChangeNotice';

/**
 * Mutfak ve duvar dolabı işinin 1. adımı: duvarın ayrıntılı ölçüsü (şakulsüz / açılı yan duvarlar, basık ya da
 * şişik tavan, eğimli zemin) ve engeller. İstenildiği zaman geri dönülüp değiştirilebilir; sonraki adımlar uyarı verir.
 */
export default function WallSurveyPage() {
  const setActivePage = useUIStore((s) => s.setActivePage);
  const addWall = useProjectStore((s) => s.addWall);
  const job = useActiveJob();
  const wall = useActiveWall();
  const [depth, setDepth] = useState(600);
  const [top, setTop] = useState(0);
  const [base, setBase] = useState(100);

  const survey = useMemo(() => (wall ? surveyOf(wall) : null), [wall]);
  const opts = useMemo(() => ({ depth, installGap: wall?.installGap ?? 0, cabinetTop: top > 0 ? top : undefined, plinth: base, legs: base }), [depth, wall?.installGap, top, base]);
  const analysis = useMemo(() => (survey ? analyzeWall(survey, opts) : null), [survey, opts]);

  if (!wall || !survey || !analysis) {
    return (
      <EmptyState icon={<Ruler size={32} />} title="Henüz duvar yok"
        text="Dolabın yapılacağı duvarı ekleyip ölçülerini girin. L ya da U düzende her duvarı ayrı ekleyin."
        action={<Button variant="primary" onClick={() => addWall(null)}><Plus size={15} /> Duvar ekle</Button>} />
    );
  }

  const next = job?.kind === 'built_in' ? 'wall-shape' : 'wall-layout';
  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-80 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setActivePage('project')}>
          <ArrowLeft size={14} /> Projeye dön
        </Button>
        <WallPicker activeId={wall.id} />
        {!wall.survey && (
          <p className="text-[11px] text-[var(--color-text-dim)] rounded-md bg-[var(--color-bg)] p-2">
            Bu duvar basit ölçüyle (3 genişlik, 3 yükseklik) girilmiş. Aşağıdaki değerler ondan çıkarıldı; bir değeri değiştirdiğiniz anda ayrıntılı ölçüye geçilir.
          </p>
        )}
        <SurveyForm wall={wall} survey={survey} />
        <ObstacleEditor wall={wall} />
        <p className="text-[11px] text-[var(--color-text-dim)]">
          Ölçüleri ve engelleri sonradan da değiştirebilirsiniz. Dolaplar kurulduktan sonra bir şey değişirse sonraki adımlarda uyarı çıkar ve dolaplar yeniden hesaplanabilir.
        </p>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <WallChangeNotice wall={wall} />
        <SurveyDrawing survey={survey} opts={opts} obstacles={wall.obstacles} sideObstacles={wall.sideObstacles} />
      </div>

      <aside className="w-80 shrink-0 h-full overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2" data-tour="survey-options">
          <NumInput label="Dolap derinliği" value={depth} onChange={(v) => setDepth(Math.max(100, v))} min={100} max={1200} />
          <NumInput label="Baza / ayak" value={base} onChange={setBase} max={300} hint="En yüksek zemin noktasında" />
          <NumInput label="Dolap üst kotu" value={top} onChange={setTop} max={6000} hint="Terazideki tabandan; 0 = en alçak tavana kadar" />
        </div>
        <SurveyResults a={analysis} sideBlocks={sideObstaclesOnWall(wall, depth)} length={survey.length} />
        <Button variant="primary" onClick={() => setActivePage(next)}>
          Sonraki adım: {job?.kind === 'built_in' ? 'Duvar şekli ve dolap alanı' : 'Yerleşim'} <ArrowRight size={14} />
        </Button>
      </aside>
    </div>
  );
}
