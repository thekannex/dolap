import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CircleHelp, X, ArrowLeft, ArrowRight } from 'lucide-react';
import type { PageId } from '../../../stores/ui-store';
import { TOURS } from './tours';
import type { TourStep } from './tours';
import { placeBubble } from './placement';
import type { Box } from './placement';

const SEEN_KEY = 'dolap.tour.seen';
const PAD = 6;

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]); } catch { return new Set(); }
}
function markSeen(page: string) {
  try { const s = readSeen(); s.add(page); localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch { /* depolama kapalı */ }
}

const findTarget = (t?: string) => (t ? document.querySelector<HTMLElement>(`[data-tour="${t}"]`) : null);

/** Ekranda görünen (boyutu olan) hedefin kutusu. */
function targetBox(t?: string): Box | null {
  const el = findTarget(t);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

/**
 * Sayfa tanıtımı: köşedeki ? düğmesiyle başlar, alanları sırayla vurgulayıp balonla anlatır.
 * İleri / Geri, ok tuşları; Esc ya da × kapatır. Sayfa değişince yeniden kurulur (key ile).
 */
export default function PageTour({ page }: { page: PageId }) {
  const all = TOURS[page];
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(() => readSeen().has(page));

  const close = useCallback(() => { setSteps(null); setI(0); }, []);

  const start = () => {
    if (!all) return;
    // O an ekranda olmayan alanların adımları atlanır
    const available = all.filter((s) => !s.target || targetBox(s.target));
    setSteps(available.length > 0 ? available : all);
    setI(0);
    markSeen(page);
    setSeen(true);
  };

  const step = steps?.[i];

  // Hedefi görünür yapıp ölç; balonu yerleştir
  const measure = useCallback(() => {
    if (!step) return;
    const b = targetBox(step.target);
    setBox(b);
    const el = bubbleRef.current;
    const size = { width: el?.offsetWidth ?? 320, height: el?.offsetHeight ?? 180 };
    setPos(placeBubble(b, size, { width: window.innerWidth, height: window.innerHeight }));
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    findTarget(step.target)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // Konum DOM'dan (dış kaynak) ölçülür
    // oxlint-disable-next-line react/set-state-in-effect
    measure();
    // Balon boyutu ilk çizimde belli olur; bir kare sonra yeniden yerleştir
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [step, measure]);

  useEffect(() => {
    if (!steps) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (i < steps.length - 1) setI(i + 1); else close(); }
      else if (e.key === 'ArrowLeft') setI(Math.max(0, i - 1));
      else return;
      // Sayfanın kendi kısayolları (kutu kaydırma, geri al) çalışmasın
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [steps, i, measure, close]);

  if (!all) return null;
  const last = steps ? i === steps.length - 1 : false;

  return (
    <>
      <button onClick={start} title="Bu sayfayı tanıt" aria-label="Bu sayfayı tanıt" data-tour-button
        className="fixed bottom-3 left-3 z-40 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-bg-card)] border border-[var(--color-accent)]/50 text-[var(--color-accent)] shadow-md hover:bg-[var(--color-accent)] hover:text-white transition-colors">
        <CircleHelp size={20} />
        {!seen && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-ping" />}
      </button>

      {step && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Tanıtım: ${step.title}`}>
          {/* Tıklamalar alttaki sayfaya geçmez */}
          <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
          {box ? (
            <div className="absolute rounded-lg pointer-events-none ring-2 ring-[var(--color-accent)]"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height, boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)' }} />
          ) : (
            <div className="absolute inset-0 bg-[rgba(15,23,42,0.55)] pointer-events-none" />
          )}
          <div ref={bubbleRef} className="absolute w-80 max-w-[calc(100vw-24px)] rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-2xl p-4 flex flex-col gap-2"
            style={{ left: pos.left, top: pos.top }}>
            <div className="flex items-start gap-2">
              <h3 className="flex-1 text-sm font-bold text-[var(--color-text)]">{step.title}</h3>
              <button onClick={close} aria-label="Tanıtımı kapat" title="Kapat (Esc)"
                className="-mt-1 -mr-1 p-1 rounded text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"><X size={15} /></button>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{step.text}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-[var(--color-text-dim)] font-mono">{i + 1} / {steps!.length}</span>
              <div className="flex gap-0.5 flex-1 justify-center">
                {steps!.map((_, k) => <span key={k} className={`w-1.5 h-1.5 rounded-full ${k === i ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />)}
              </div>
              {i > 0 && (
                <button onClick={() => setI(i - 1)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">
                  <ArrowLeft size={13} /> Geri
                </button>
              )}
              <button autoFocus onClick={() => (last ? close() : setI(i + 1))}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]">
                {last ? 'Bitir' : <>İleri <ArrowRight size={13} /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
