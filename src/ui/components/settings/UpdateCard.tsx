import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button, Card } from '../shared/ui';
import { updateApi, useUpdateState } from '../../hooks/use-update';

const TEXT: Record<string, string> = {
  idle: 'Henüz denetlenmedi.',
  checking: 'Denetleniyor…',
  none: 'Dolap güncel.',
  available: 'Yeni sürüm var; üstteki şeritten indirebilirsiniz.',
  downloading: 'Yeni sürüm indiriliyor…',
  ready: 'Yeni sürüm indirildi; üstteki şeritten yeniden başlatın.',
  restarting: 'Yeniden başlatılıyor…',
};

/** Ayarlar: güncelleme durumu ve elle denetleme. */
export default function UpdateCard() {
  const s = useUpdateState();
  const api = updateApi();
  return (
    <Card title="Güncellemeler" tour="settings-update">
      <div className="p-4 flex flex-col gap-3 text-sm">
        {!api || !s || s.state === 'unsupported' ? (
          <p className="text-[var(--color-text-muted)]">
            Güncellemeler masaüstü (taşınabilir) sürümde GitHub üzerinden kendiliğinden denetlenir.
          </p>
        ) : (
          <>
            <p>Kullandığınız sürüm: <b className="font-mono">{s.current}</b>
              {s.latest && s.state !== 'none' && <> · GitHub'daki: <b className="font-mono">{s.latest.version}</b></>}</p>
            <p className={s.state === 'error' ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}>
              {s.state === 'error' ? s.error : TEXT[s.state]}
            </p>
            <p className="text-xs text-[var(--color-text-dim)]">Program her açılışta yeni sürümü denetler; güncelleme yalnızca siz onaylayınca indirilir.</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={s.state === 'checking' || s.state === 'downloading'} onClick={() => void api.check()}>
                <RefreshCw size={13} /> Şimdi denetle
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void api.openPage()}><ExternalLink size={13} /> Sürüm sayfası</Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
