import { Component, useEffect, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { Button } from './ui';

export function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  const icons = {
    success: <CheckCircle2 size={16} className="text-[var(--color-success)] shrink-0" />,
    error: <AlertCircle size={16} className="text-[var(--color-error)] shrink-0" />,
    info: <Info size={16} className="text-[var(--color-info)] shrink-0" />,
  };
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-lg rounded-lg px-3 py-2.5 text-sm animate-[fadein_.15s_ease-out]">
          {icons[t.kind]}
          <span className="flex-1 text-[var(--color-text)]">{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Kapat" className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog() {
  const req = useUIStore((s) => s.confirmRequest);
  const resolve = useUIStore((s) => s.resolveConfirm);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!req) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') resolve(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req, resolve]);

  if (!req) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/30 flex items-center justify-center p-4" onMouseDown={() => resolve(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="bg-[var(--color-bg-card)] rounded-xl shadow-2xl w-full max-w-sm p-5" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="text-base font-semibold text-[var(--color-text)]">{req.title}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">{req.message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button onClick={() => resolve(false)}>Vazgeç</Button>
          <Button ref={okRef} variant="primary" onClick={() => resolve(true)}
            className={req.danger ? '!bg-[var(--color-error)] hover:!bg-[var(--color-error)]/90' : ''}>
            {req.confirmLabel ?? 'Tamam'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Arayüz hatası', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center flex flex-col items-center gap-3">
          <AlertCircle size={32} className="text-[var(--color-error)]" />
          <h2 className="text-base font-semibold">Bu ekranda bir hata oluştu</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Projeniz otomatik olarak kaydedildi. Başka bir sayfaya geçebilir ya da yeniden deneyebilirsiniz.
          </p>
          <pre className="text-xs text-left bg-[var(--color-bg-input)] rounded p-2 max-w-full overflow-auto text-[var(--color-text-muted)]">{this.state.error.message}</pre>
          <Button variant="primary" onClick={() => this.setState({ error: null })}>Yeniden dene</Button>
        </div>
      </div>
    );
  }
}
