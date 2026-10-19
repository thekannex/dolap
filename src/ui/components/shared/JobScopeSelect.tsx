import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';

/** Kesim, teklif ve 3D'nin kapsamı: tüm işler ya da tek iş. */
export default function JobScopeSelect() {
  const jobs = useProjectStore((s) => s.project?.jobs ?? []);
  const scope = useUIStore((s) => s.scopeJobId);
  const setScope = useUIStore((s) => s.setScopeJobId);
  if (jobs.length < 2) return null;
  const value = scope && jobs.some((j) => j.id === scope) ? scope : '';
  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
      Kapsam
      <select value={value} onChange={(e) => setScope(e.target.value || null)} aria-label="Kapsam"
        className="bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-md px-2 py-1 text-sm text-[var(--color-text)]">
        <option value="">Tüm işler</option>
        {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
      </select>
    </label>
  );
}
