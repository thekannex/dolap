import { create } from 'zustand';

export type PageId = 'project' | 'wall-layout' | 'wall-shape' | 'composer' | 'editor' | 'cut-list' | '3d-preview' | 'settings';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export interface UIStore {
  activePage: PageId;
  hoveredPartId: string | null;
  toasts: Toast[];
  confirmRequest: ConfirmRequest | null;
  /** Proje listesine dönüldüğünde yeni proje formu açık gelsin mi. */
  newProjectRequested: boolean;
  /** Kesim, teklif ve 3D'nin kapsamı; null = tüm işler. */
  scopeJobId: string | null;

  setScopeJobId: (id: string | null) => void;
  setActivePage: (page: PageId) => void;
  setHoveredPartId: (id: string | null) => void;
  setNewProjectRequested: (v: boolean) => void;
  notify: (kind: Toast['kind'], text: string) => void;
  dismissToast: (id: number) => void;
  confirm: (opts: Omit<ConfirmRequest, 'resolve'>) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
}

let toastSeq = 0;

export const useUIStore = create<UIStore>((set, get) => ({
  activePage: 'project',
  hoveredPartId: null,
  toasts: [],
  confirmRequest: null,
  newProjectRequested: false,
  scopeJobId: null,

  setScopeJobId: (id) => set({ scopeJobId: id }),
  setActivePage: (page) => set({ activePage: page }),
  setHoveredPartId: (id) => set({ hoveredPartId: id }),
  setNewProjectRequested: (v) => set({ newProjectRequested: v }),

  notify: (kind, text) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  confirm: (opts) => new Promise<boolean>((resolve) => {
    get().confirmRequest?.resolve(false);
    set({ confirmRequest: { ...opts, resolve } });
  }),
  resolveConfirm: (ok) => {
    const req = get().confirmRequest;
    set({ confirmRequest: null });
    req?.resolve(ok);
  },
}));
