import { describe, it, expect } from 'vitest';
import { UndoHistory } from '../../core/utils/undo-history';

describe('geri al / yinele', () => {
  it('sırayla geri alır ve yineler', () => {
    const h = new UndoHistory<string>();
    h.record('a', 0); // a → b
    h.record('b', 1000); // b → c
    expect(h.undo('c')).toBe('b');
    expect(h.undo('b')).toBe('a');
    expect(h.undo('a')).toBeNull();
    expect(h.redo('a')).toBe('b');
    expect(h.redo('b')).toBe('c');
    expect(h.canRedo).toBe(false);
  });

  it('art arda gelen değişiklikler tek adım sayılır', () => {
    const h = new UndoHistory<string>(100, 600);
    h.record('a', 0);
    h.record('ab', 200);
    h.record('abc', 400);
    expect(h.undoCount).toBe(1);
    expect(h.undo('abcd')).toBe('a');
  });

  it('yeni değişiklik yinelemeyi siler', () => {
    const h = new UndoHistory<number>();
    h.record(1, 0);
    expect(h.undo(2)).toBe(1);
    h.record(1, 5000);
    expect(h.canRedo).toBe(false);
  });

  it('geri aldıktan hemen sonraki değişiklik ayrı adım olur', () => {
    const h = new UndoHistory<number>(100, 600);
    h.record(1, 0);
    h.record(2, 1000);
    h.undo(3);
    h.record(2, 1100);
    expect(h.undoCount).toBe(2);
  });

  it('sınırı aşınca en eskiyi atar', () => {
    const h = new UndoHistory<number>(3, 0);
    for (let i = 0; i < 5; i++) h.record(i, i * 10);
    expect(h.undoCount).toBe(3);
    expect(h.undo(5)).toBe(4);
  });
});
