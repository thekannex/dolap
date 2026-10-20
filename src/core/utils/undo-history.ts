/**
 * Geri al / yinele geçmişi. Değişmez (immutable) durum anlık görüntülerini tutar.
 * Kısa aralıkla art arda gelen değişiklikler (yazarken, sürüklerken) tek adımda birleşir.
 */
export class UndoHistory<T> {
  private past: T[] = [];
  private future: T[] = [];
  private lastAt = -Infinity;

  private readonly limit: number;
  private readonly mergeMs: number;

  constructor(limit = 100, mergeMs = 600) {
    this.limit = limit;
    this.mergeMs = mergeMs;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  get undoCount() { return this.past.length; }

  /** Durum prev'den değişti; prev geri alma noktası olarak saklanır (yakın zamanda saklandıysa birleşir). */
  record(prev: T, now: number = Date.now()) {
    if (this.past.length === 0 || now - this.lastAt > this.mergeMs) {
      this.past.push(prev);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.lastAt = now;
    this.future = [];
  }

  /** Bir önceki duruma döner; current yinelemek için saklanır. */
  undo(current: T): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(current);
    this.lastAt = -Infinity;
    return prev;
  }

  redo(current: T): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(current);
    this.lastAt = -Infinity;
    return next;
  }

  clear() {
    this.past = [];
    this.future = [];
    this.lastAt = -Infinity;
  }
}
