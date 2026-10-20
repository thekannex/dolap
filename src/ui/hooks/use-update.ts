import { useEffect, useState } from 'react';

/** Masaüstü sürümün güncelleyicisinin durumu (electron/main.cjs ile aynı biçim). */
export interface UpdateState {
  state: 'unsupported' | 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'restarting' | 'error';
  current: string;
  latest?: { version: string; title: string; notes: string; page: string; size?: number };
  progress?: number;
  writable?: boolean;
  error?: string;
  during?: 'check' | 'download' | 'install';
}

export interface UpdateApi {
  getState: () => Promise<UpdateState>;
  check: () => Promise<UpdateState>;
  download: () => Promise<UpdateState>;
  install: () => Promise<UpdateState>;
  openPage: () => Promise<void>;
  onState: (cb: (s: UpdateState) => void) => () => void;
}

declare global {
  interface Window { dolapUpdate?: UpdateApi }
}

/** Güncelleyici yalnızca masaüstü (taşınabilir) sürümde vardır; tarayıcıda null döner. */
export const updateApi = (): UpdateApi | null => (typeof window !== 'undefined' ? window.dolapUpdate ?? null : null);

export function useUpdateState(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null);
  useEffect(() => {
    const api = updateApi();
    if (!api) return;
    let alive = true;
    void api.getState().then((s) => { if (alive) setState(s); });
    const off = api.onState((s) => setState(s));
    return () => { alive = false; off(); };
  }, []);
  return state;
}
