import { useState } from 'react';
import { Download, RefreshCw, X, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { saveNow } from '../../../stores/autosave';
import { updateApi, useUpdateState } from '../../hooks/use-update';

const mb = (b?: number) => (b ? `${(b / 1024 / 1024).toFixed(0)} MB` : '');

/** Yeni sürüm bulununca üstte görünen şerit: indir, ilerleme, yeniden başlat. */
export default function UpdateBanner() {
  const s = useUpdateState();
  const [hidden, setHidden] = useState<string | null>(null);
  const [notes, setNotes] = useState(false);
  const api = updateApi();
  if (!s || !api) return null;

  const showError = s.state === 'error' && s.during !== 'check';
  if (!['available', 'downloading', 'ready', 'restarting'].includes(s.state) && !showError) return null;
  if (s.state === 'available' && hidden === s.latest?.version) return null;

  const v = s.latest?.version ?? '';
  const btn = 'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors';
  return (
    <div role="status" className="shrink-0 border-b border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 px-4 py-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-3 text-sm">
        {s.state === 'available' && (
          <>
            <Download size={16} className="text-[var(--color-accent)] shrink-0" />
            <span className="flex-1"><b>Dolap {v}</b> yayımlandı (kullandığınız: {s.current}).</span>
            {s.latest?.notes && <button className={`${btn} text-[var(--color-text-muted)] hover:text-[var(--color-text)]`} onClick={() => setNotes(!notes)}>{notes ? 'Notları gizle' : 'Neler yeni?'}</button>}
            {s.writable === false ? (
              <button className={`${btn} bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]`} onClick={() => void api.openPage()}>
                <ExternalLink size={13} /> İndirme sayfasını aç
              </button>
            ) : (
              <button className={`${btn} bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]`} onClick={() => void api.download()}>
                <Download size={13} /> İndir ve güncelle {mb(s.latest?.size) && `(${mb(s.latest?.size)})`}
              </button>
            )}
            <button className="p-1 rounded text-[var(--color-text-dim)] hover:text-[var(--color-text)]" title="Sonra" aria-label="Sonra" onClick={() => setHidden(v)}><X size={14} /></button>
          </>
        )}
        {s.state === 'downloading' && (
          <>
            <Loader2 size={16} className="text-[var(--color-accent)] animate-spin shrink-0" />
            <span className="whitespace-nowrap">Dolap {v} indiriliyor… %{Math.round((s.progress ?? 0) * 100)}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
              <div className="h-full bg-[var(--color-accent)] transition-[width]" style={{ width: `${Math.round((s.progress ?? 0) * 100)}%` }} />
            </div>
          </>
        )}
        {(s.state === 'ready' || s.state === 'restarting') && (
          <>
            <RefreshCw size={16} className="text-[var(--color-accent)] shrink-0" />
            <span className="flex-1"><b>Dolap {v}</b> indirildi. Yeniden başlatınca yeni sürüm açılır; projeleriniz korunur.</span>
            <button disabled={s.state === 'restarting'} className={`${btn} bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60`}
              onClick={async () => { await saveNow(); await api.install(); }}>
              <RefreshCw size={13} /> Şimdi yeniden başlat
            </button>
          </>
        )}
        {showError && (
          <>
            <AlertTriangle size={16} className="text-[var(--color-warning)] shrink-0" />
            <span className="flex-1">{s.error}</span>
            <button className={`${btn} border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]`} onClick={() => void (s.during === 'download' ? api.download() : api.openPage())}>
              {s.during === 'download' ? 'Tekrar dene' : 'İndirme sayfasını aç'}
            </button>
          </>
        )}
      </div>
      {notes && s.latest?.notes && (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs font-sans text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md p-3">{s.latest.notes}</pre>
      )}
    </div>
  );
}
