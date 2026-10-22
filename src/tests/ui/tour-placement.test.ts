import { describe, it, expect } from 'vitest';
import { placeBubble } from '../../ui/components/tour/placement';
import { TOURS } from '../../ui/components/tour/tours';

const view = { width: 1400, height: 900 };
const bubble = { width: 320, height: 160 };

describe('tanıtım balonu konumu', () => {
  it('hedefin altına, ortalı', () => {
    expect(placeBubble({ left: 600, top: 100, width: 200, height: 40 }, bubble, view)).toEqual({ left: 540, top: 154 });
  });

  it('altta yer yoksa üstüne', () => {
    expect(placeBubble({ left: 600, top: 800, width: 200, height: 60 }, bubble, view)).toEqual({ left: 540, top: 626 });
  });

  it('dikey yer yoksa sağına', () => {
    const p = placeBubble({ left: 0, top: 50, width: 320, height: 800 }, bubble, view);
    expect(p).toEqual({ left: 334, top: 370 });
  });

  it('ekranı kaplayan hedefte içeride alta', () => {
    const p = placeBubble({ left: 0, top: 50, width: 1400, height: 850 }, bubble, view);
    expect(p.top).toBe(900 - 160 - 24);
    expect(p.left).toBe(540);
  });

  it('kenarda taşmaz', () => {
    expect(placeBubble({ left: 1350, top: 100, width: 40, height: 40 }, bubble, view).left).toBe(1400 - 320 - 12);
  });

  it('hedef yoksa ortada', () => {
    expect(placeBubble(null, bubble, view)).toEqual({ left: 540, top: 370 });
  });
});

describe('tanıtımlar', () => {
  it('her ana sayfanın tanıtımı var ve adımlar dolu', () => {
    for (const page of ['projects', 'project', 'wall-survey', 'wall-layout', 'wall-shape', 'composer', 'editor', 'cut-list', '3d-preview', 'settings'] as const) {
      expect(TOURS[page]?.length ?? 0).toBeGreaterThan(2);
      for (const s of TOURS[page]!) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.text.length).toBeGreaterThan(20);
      }
    }
  });
});
