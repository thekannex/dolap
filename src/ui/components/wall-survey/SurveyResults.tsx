import type { WallAnalysis } from '../../../core/layout/wall-survey';
import type { Obstacle } from '../../../core/models/project';
import { formatNumber } from '../../../core/utils/format';
import { Section } from '../shared/ui';

const n = (v: number) => formatNumber(Math.round(v * 10) / 10);

function Table({ head, rows }: { head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-[10px] uppercase text-[var(--color-text-dim)]">
        <tr>{head.map((h) => <th key={h} className="text-right first:text-left font-medium py-1 px-1">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border)]">
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className="text-right first:text-left font-mono py-1 px-1">{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/** Ölçüden çıkan dört sonuç: dolap sığan alan, kama dolgular, baza/ayak ve tavan kapama. */
export default function SurveyResults({ a, sideBlocks = [], length }: { a: WallAnalysis; sideBlocks?: Obstacle[]; length: number }) {
  return (
    <div className="flex flex-col gap-1" data-tour="survey-results">
      <Section title="Dolabın sığdığı alan">
        <p className="text-2xl font-bold font-mono text-[var(--color-accent)]">{n(a.width)} × {n(a.height)}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Genişlik × yükseklik (mm). Soldan {n(a.x0)} mm'den başlar. Dolaplar terazide, zeminin en yüksek noktasına
          göre durur{a.baseLevel !== 0 ? ` (sol köşeden ${n(a.baseLevel)} mm yukarıda)` : ''}. Mutfak önerisi ve duvar dolabı bu alanı kullanır.
        </p>
        {a.warnings.map((w) => <p key={w} className="text-xs text-[var(--color-warning)]">{w}</p>)}
        {sideBlocks.map((b) => (
          <p key={b.id} className="text-xs text-[var(--color-warning)]">
            {b.x === 0 ? 'Sol' : 'Sağ'} yan duvardaki engel dolabın derinliğine giriyor: yerden {n(b.y)}–{n(b.y + b.height)} mm arasında
            dolap {b.x === 0 ? 'soldan' : 'sağdan'} {n(b.x === 0 ? b.width : length - b.x)} mm içeriden başlar (duvar dolabı bunu kendiliğinden hesaba katar).
          </p>
        ))}
      </Section>

      <Section title="Kama dolgular (yan duvarlar)">
        {a.fillers.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">Yan duvarlar dik ve şakulünde; kama dolgu gerekmez.</p>
        ) : (
          <>
            <Table head={['Yan', 'Önde alt', 'Önde üst', 'Arkada', 'Boy']}
              rows={a.fillers.map((f) => [f.side === 'left' ? 'Sol' : 'Sağ', n(f.bottom), n(f.top), n(f.back), n(f.height)])} />
            <p className="text-[11px] text-[var(--color-text-dim)]">
              Dolap yanı ile duvar arasındaki boşluk (mm). Dolgu paneli en geniş ölçüde kesilip duvara göre rendelenir (traşlanır).
              "Önde" ve "Arkada" farklıysa köşe 90° değildir.
            </p>
          </>
        )}
      </Section>

      <Section title="Baza ve ayak">
        <Table head={['Soldan', 'Zemin', 'Ek', 'Baza', 'Ayak']}
          rows={a.floorTable.map((r) => [n(r.x), (r.floor > 0 ? '+' : '') + n(r.floor), n(r.extra), n(r.plinth), n(r.legs)])} />
        <p className="text-[11px] text-[var(--color-text-dim)]">
          En yüksek noktada seçtiğiniz baza / ayak yüksekliğine, zemin alçaldıkça "Ek" kadar eklenir; baza alt kenarı bu profile göre kesilir.
        </p>
      </Section>

      <Section title="Tavan kapama">
        <Table head={['Soldan', 'Tavan', 'Kapama']}
          rows={a.ceilingTable.map((r) => [n(r.x), n(r.ceiling), n(r.gap)])} />
        <p className="text-[11px] text-[var(--color-text-dim)]">
          Dolap üstü ile tavan arasındaki kapamanın her noktadaki yüksekliği (mm); kapama bu ölçülere göre şablon gibi kesilir.
        </p>
      </Section>
    </div>
  );
}
