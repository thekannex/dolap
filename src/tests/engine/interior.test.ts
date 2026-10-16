import { describe, it, expect } from 'vitest';
import {
  layoutInterior, resolveInterior, innerBox, interiorFrameOf, distributeShelves, newCell, newColumn,
  splitColumn, removeColumn, splitCell, removeCell, setColumnWidth, setCellHeight, moveDivider, movePartition,
  moveShelf, updateCell, setShelfCount, interiorFromCabinet, cellLabel, cellContentLabel, equalizeColumns, equalizeCells,
  groupColumns, ungroupColumns, setDividerBehind, equalizeColumnSubset, groupRange, moveColumn, nestColumn, columnUnits, setGroupWidth, equalizeGroup,
} from '../../core/engine/interior';
import type { InteriorFrame } from '../../core/engine/interior';
import { computeCabinet } from '../../core/engine/compute-cabinet';
import { applyTypePreset, DEFAULT_CABINET } from '../../core/engine/cabinet-factory';
import { COMPOSITION_TEMPLATES } from '../../core/layout/composition';
import type { CabinetInterior, CabinetState } from '../../core/models/cabinet';

// 1000 × 800 kutu, 18mm gövde: iç açıklık 964 × 764
const frame = (patch: Partial<InteriorFrame> = {}): InteriorFrame => ({
  W: 1000, H: 800, t: 18, plinth: 0, omitLeft: false, omitBottom: false, doorGap: 3, inset: false, ...patch,
});
const twoCols = (): CabinetInterior => ({
  columns: [newColumn([newCell('door', { hinge: 'left' })], 400), newColumn([newCell('drawer', { height: 200 }), newCell('open')])],
});

describe('iç düzen geometrisi', () => {
  it('son sütun ve üst göz kalan ölçüyü alır', () => {
    const r = resolveInterior(twoCols(), frame());
    expect(r.columns.map((c) => c.width)).toEqual([400, 546]); // 964 - 400 - 18
    expect(r.columns[1].cells.map((c) => c.height)).toEqual([200, 546]); // 764 - 200 - 18
    expect(innerBox(frame({ omitLeft: true, omitBottom: true, plinth: 60 }))).toEqual({ x: 0, y: 60, w: 982, h: 722 });
  });

  it('ara dikme ve ara tabla konumları', () => {
    const g = layoutInterior(twoCols(), frame());
    expect(g.dividers).toEqual([{ x: 418, y: 18, w: 18, h: 764, index: 0, behind: null }]);
    expect(g.partitions).toEqual([{ x: 436, y: 218, w: 546, h: 18, col: 1, cell: 0 }]);
    expect(g.cells.map((c) => c.opening)).toEqual([
      { x: 18, y: 18, w: 400, h: 764 },
      { x: 436, y: 18, w: 546, h: 200 },
      { x: 436, y: 236, w: 546, h: 546 },
    ]);
  });

  it('bindirme önler dikme ve tablanın yarısını örter', () => {
    const g = layoutInterior(twoCols(), frame());
    const door = g.fronts.find((f) => f.kind === 'door')!;
    expect(door.rect).toEqual({ x: 1.5, y: 1.5, w: 424, h: 797 }); // 0..427 - 3
    const drawer = g.fronts.find((f) => f.kind === 'drawer')!;
    expect(drawer.rect).toEqual({ x: 428.5, y: 1.5, w: 570, h: 224 }); // 427..1000, 0..227
  });

  it('gömme önler gözün içine oturur', () => {
    const g = layoutInterior(twoCols(), frame({ inset: true }));
    expect(g.fronts.find((f) => f.kind === 'door')!.rect).toEqual({ x: 21, y: 21, w: 394, h: 758 });
    expect(g.fronts.find((f) => f.kind === 'drawer')!.rect).toEqual({ x: 439, y: 21, w: 540, h: 194 });
  });

  it('çift kapak ve çoklu çekmece bölünür; yukarı açılan tek parça', () => {
    const it: CabinetInterior = { columns: [newColumn([newCell('drawer', { drawerCount: 3, height: 400 }), newCell('door', { doorCount: 2 })])] };
    const g = layoutInterior(it, frame({ inset: true }));
    const doors = g.fronts.filter((f) => f.kind === 'door');
    expect(doors).toHaveLength(2);
    expect(doors.map((d) => d.hinge)).toEqual(['left', 'right']);
    expect(doors[0].rect.w).toBe(doors[1].rect.w);
    const drawers = g.fronts.filter((f) => f.kind === 'drawer');
    expect(drawers).toHaveLength(3);
    expect(drawers[0].rect.y).toBeGreaterThan(drawers[2].rect.y); // üstten alta
    const up = layoutInterior({ columns: [newColumn([newCell('door', { opening: 'up', doorCount: 2 })])] }, frame());
    expect(up.fronts).toHaveLength(1);
  });

  it('raflar ve askı', () => {
    const it: CabinetInterior = { columns: [newColumn([newCell('open', { shelves: [200, 500, 900], shelfType: 'fixed', rod: true })])] };
    const g = layoutInterior(it, frame());
    expect(g.shelves.map((s) => s.rect.y)).toEqual([218, 518]); // 900 göz dışında
    expect(g.shelves[0]).toMatchObject({ fixed: true, rect: { w: 964 } });
    expect(g.rods).toHaveLength(1);
    const adj = layoutInterior({ columns: [newColumn([newCell('door', { shelves: [300] })])] }, frame());
    expect(adj.shelves[0].rect).toMatchObject({ x: 19, w: 962 });
  });

  it('sığmayan bölme ve göz için hata', () => {
    const it: CabinetInterior = { columns: [newColumn([newCell()], 900), newColumn([newCell()], 0)] };
    expect(layoutInterior(it, frame()).warnings.some((w) => w.ruleId === 'VAL_INTERIOR_WIDTH')).toBe(true);
    const tall: CabinetInterior = { columns: [newColumn([newCell('open', { height: 740 }), newCell()])] };
    expect(layoutInterior(tall, frame()).warnings.some((w) => w.ruleId === 'VAL_INTERIOR_HEIGHT')).toBe(true);
  });
});

describe('iç düzen işlemleri', () => {
  const f = frame();

  it('dikey böl ve kaldır', () => {
    const one: CabinetInterior = { columns: [newColumn([newCell('door')])] };
    const two = splitColumn(0)(one, f);
    expect(two.columns.map((c) => c.width)).toEqual([473, 473]); // (964-18)/2
    expect(two.columns[1].cells[0].content).toBe('open');
    const back = removeColumn(1)(two, f);
    expect(back.columns).toHaveLength(1);
    expect(back.columns[0].width).toBe(964);
    expect(removeColumn(0)(one, f).columns).toHaveLength(1);
  });

  it('yatay böl ve kaldır', () => {
    const one: CabinetInterior = { columns: [newColumn([newCell('door', { shelves: [100, 600] })])] };
    const two = splitCell(0, 0)(one, f);
    expect(two.columns[0].cells.map((c) => c.height)).toEqual([373, 373]);
    expect(two.columns[0].cells[0].shelves).toEqual([100]);
    expect(removeCell(0, 1)(two, f).columns[0].cells[0].height).toBe(764);
    expect(removeCell(0, 0)(two, f).columns[0].cells).toHaveLength(1);
  });

  it('genişlik ve yükseklik ayarı komşudan alınır, sınırlanır', () => {
    const r = setColumnWidth(0, 500)(twoCols(), f);
    expect(r.columns.map((c) => c.width)).toEqual([500, 446]);
    expect(setColumnWidth(1, 300)(twoCols(), f).columns.map((c) => c.width)).toEqual([646, 300]);
    expect(setColumnWidth(0, 5000)(twoCols(), f).columns[1].width).toBe(80);
    const h = setCellHeight(1, 0, 300)(twoCols(), f);
    expect(h.columns[1].cells.map((c) => c.height)).toEqual([300, 446]);
    expect(setCellHeight(0, 0, 100)(twoCols(), f).columns[0].cells[0].height).toBe(764);
  });

  it('dikme, tabla ve raf sürükleme', () => {
    expect(moveDivider(0, 18 + 300)(twoCols(), f).columns[0].width).toBe(300);
    expect(movePartition(1, 0, 18 + 250)(twoCols(), f).columns[1].cells[0].height).toBe(250);
    const withShelves = updateCell(0, 0, { shelves: [200, 400] })(twoCols(), f);
    expect(moveShelf(0, 0, 0, 300)(withShelves, f).columns[0].cells[0].shelves).toEqual([300, 400]);
    // komşu rafı geçemez
    expect(moveShelf(0, 0, 0, 500)(withShelves, f).columns[0].cells[0].shelves[0]).toBe(362);
  });

  it('bölmeleri ve gözleri eşitle', () => {
    const three: CabinetInterior = { columns: [newColumn([newCell()], 100), newColumn([newCell()], 500), newColumn([newCell()])] };
    const eq = equalizeColumns()(three, f);
    // 964 - 2×18 = 928 → 309,5 + 309,5 + 309
    expect(eq.columns.map((c) => c.width)).toEqual([309, 309, 310]);
    expect(eq.columns.reduce((s, c) => s + c.width, 0) + 2 * 18).toBe(964);
    const cells: CabinetInterior = { columns: [newColumn([newCell('open', { height: 100, shelves: [50] }), newCell('open', { height: 500 }), newCell()])] };
    const eqc = equalizeCells(0)(cells, f);
    expect(eqc.columns[0].cells.map((c) => c.height)).toEqual([242.5, 242.5, 243]);
    expect(eqc.columns[0].cells[0].shelves).toEqual([50]);
  });

  describe('bölme grupları (iç içe birim)', () => {
    // 964 iç genişlik: 300 | 200 | 428 (kalan)
    const three = (): CabinetInterior => ({ columns: [newColumn([newCell()], 300), newColumn([newCell()], 200), newColumn([newCell()])] });
    const widths = (it: CabinetInterior) => resolveInterior(it, f).columns.map((c) => c.width);
    const grouped23 = () => groupColumns([1, 2], 'g')(three(), f);

    it('gruplamak ölçüleri değiştirmez', () => {
      expect(widths(grouped23())).toEqual([300, 200, 428]);
      expect(grouped23().columns.map((c) => c.group ?? null)).toEqual([null, 'g', 'g']);
      expect(columnUnits(grouped23().columns)).toEqual([[0, 0], [1, 2]]);
    });

    it('bitişik olmayan ya da tek bölme gruplanmaz', () => {
      expect(groupColumns([0, 2])(three(), f).columns.every((c) => !c.group)).toBe(true);
      expect(groupColumns([1])(three(), f).columns.every((c) => !c.group)).toBe(true);
    });

    it('üstten eşitle: grup tek bölme sayılır, grubun içindeki oran korunur', () => {
      // 964 - 18 = 946 → 1. bölme 473, grup 473 (içi 200:428 oranında, aradaki dikme 18)
      const eq = equalizeColumns()(grouped23(), f);
      const w = widths(eq);
      expect(w[0]).toBe(473);
      expect(w[1] + w[2] + 18).toBe(473);
      expect(w[1] / w[2]).toBeCloseTo(200 / 428, 2);
    });

    it('grubun içi ayrıca eşitlenir, grup toplamı korunur', () => {
      const g = equalizeGroup('g')(grouped23(), f);
      expect(widths(g)).toEqual([300, 314, 314]);
      const g0 = grouped23();
      expect(equalizeGroup('yok')(g0, f)).toEqual(resolveInterior(g0, f));
    });

    it('gruptaki bölme değişince yalnızca grup içindeki komşu etkilenir', () => {
      expect(widths(setColumnWidth(1, 250)(grouped23(), f))).toEqual([300, 250, 378]);
      expect(widths(setColumnWidth(2, 300)(grouped23(), f))).toEqual([300, 328, 300]);
    });

    it('grupsuz bölme değişince yandaki grup oranını koruyarak daralır', () => {
      const w = widths(setColumnWidth(0, 400)(grouped23(), f));
      expect(w[0]).toBe(400);
      expect(w[1] + w[2]).toBe(528);
      expect(w[1] / w[2]).toBeCloseTo(200 / 428, 2);
    });

    it('grup toplamı verilince yandaki birim değişir', () => {
      const w = widths(setGroupWidth('g', 500)(grouped23(), f));
      expect(w[0]).toBe(964 - 18 - 500);
      expect(w[1] + w[2] + 18).toBe(500);
      const g0 = grouped23();
      expect(setGroupWidth('yok', 500)(g0, f)).toEqual(resolveInterior(g0, f));
      const all = groupColumns([0, 1, 2], 'h')(three(), f);
      expect(setGroupWidth('h', 500)(all, f)).toEqual(resolveInterior(all, f));
    });

    it('dikme sürükleme: grup içi dikme komşular arasında, dış dikme grubu bütün olarak taşır', () => {
      // grup içi: 2. bölmenin sağı (dikme 1)
      const inner = moveDivider(1, 18 + 300 + 18 + 260)(grouped23(), f);
      expect(widths(inner)).toEqual([300, 260, 368]);
      // dış: 1. bölmenin sağı (dikme 0) → 1. bölme 350, grup 946 - 350 oranlı
      const outer = widths(moveDivider(0, 18 + 350)(grouped23(), f));
      expect(outer[0]).toBe(350);
      expect(outer[1] + outer[2] + 18).toBe(596);
      expect(widths(moveDivider(5, 100)(grouped23(), f))).toEqual([300, 200, 428]);
    });

    it('sürükle-bırak: üstüne bırakınca yanına taşınıp gruplanır, ölçüler korunur', () => {
      const t3 = three();
      const ids = t3.columns.map((c) => c.id);
      const n = nestColumn(2, 0, 'g9')(t3, f);
      expect(n.columns.map((c) => c.id)).toEqual([ids[0], ids[2], ids[1]]);
      expect(n.columns.map((c) => c.group ?? null)).toEqual(['g9', 'g9', null]);
      expect(widths(n)).toEqual([300, 428, 200]);
      expect(nestColumn(2, 0)(n, f).columns.every((c) => c.group === 'g9')).toBe(true);
      expect(nestColumn(1, 1)(t3, f)).toEqual(resolveInterior(t3, f));
      expect(nestColumn(0, 2, 'z')(t3, f).columns.map((c) => c.id)).toEqual([ids[1], ids[2], ids[0]]);
    });

    it('sürükle-bırak: araya bırakınca sıra değişir, grup değişebilir', () => {
      const t3 = three();
      const ids = t3.columns.map((c) => c.id);
      expect(moveColumn(0, 3)(t3, f).columns.map((c) => c.id)).toEqual([ids[1], ids[2], ids[0]]);
      const out = moveColumn(2, 1, null)(grouped23(), f);
      expect(out.columns.every((c) => !c.group)).toBe(true);
      const into = moveColumn(0, 2, 'g')(grouped23(), f);
      expect(into.columns.every((c) => c.group === 'g')).toBe(true);
      expect(moveColumn(9, 0)(t3, f)).toEqual(resolveInterior(t3, f));
    });

    it('bölünen bölme gruba katılır; silinince tek kalan grup çözülür; grubu çöz', () => {
      const s = splitColumn(1)(grouped23(), f);
      expect(s.columns.slice(1).every((c) => c.group === 'g')).toBe(true);
      expect(removeColumn(1)(grouped23(), f).columns.every((c) => !c.group)).toBe(true);
      expect(ungroupColumns('g')(grouped23(), f).columns.every((c) => !c.group)).toBe(true);
      const once = equalizeColumnSubset([1, 2])(three(), f);
      expect(widths(once)).toEqual([300, 314, 314]);
      expect(equalizeColumnSubset([1])(three(), f).columns[1].width).toBe(200);
    });

    it('geometride grup parantezi ve aralığı', () => {
      expect(layoutInterior(grouped23(), f).groups).toEqual([{ id: 'g', first: 1, last: 2, x: 336, w: 646 }]);
      expect(groupRange(grouped23().columns, 2)).toEqual([1, 2]);
      expect(groupRange(grouped23().columns, 0)).toEqual([0, 0]);
    });
  });

  it('raf sayısı eşit dağıtılır', () => {
    expect(distributeShelves(764, 2, 18)).toEqual([242.5, 503]);
    expect(distributeShelves(500, 0, 18)).toEqual([]);
    expect(setShelfCount(0, 0, 3)(twoCols(), f).columns[0].cells[0].shelves).toHaveLength(3);
  });

  it('düz dolaptan iç düzen ve etiketler', () => {
    const base = { ...DEFAULT_CABINET } as CabinetState;
    expect(interiorFromCabinet(applyTypePreset(base, 'drawer_base', 600)).columns[0].cells[0]).toMatchObject({ content: 'drawer', drawerCount: 3 });
    expect(interiorFromCabinet(applyTypePreset(base, 'bookcase', 800)).columns[0].cells[0]).toMatchObject({ content: 'open' });
    expect(interiorFromCabinet({ ...base, doorOpening: 'up' }).columns[0].cells[0].opening).toBe('up');
    expect(interiorFromCabinet({ ...base, width: 900, hangerRodCount: 1 }).columns[0].cells[0]).toMatchObject({ doorCount: 2, rod: true });
    expect(cellLabel(1, 2)).toBe('2C');
    expect(cellContentLabel(newCell('drawer', { drawerCount: 2 }))).toBe('2 çekmece');
    expect(cellContentLabel(newCell('open'))).toBe('Açık niş');
    expect(cellContentLabel(newCell('door', { opening: 'up' }))).toBe('Yukarı açılır kapak');
    expect(interiorFrameOf({ ...base, legHeight: 150, height: 620 })).toMatchObject({ H: 470 });
  });
});

describe('bölmeli dolabın kesim listesi', () => {
  const cab = (interior: CabinetInterior, patch: Partial<CabinetState> = {}): CabinetState =>
    ({ ...DEFAULT_CABINET, type: 'custom', width: 1000, height: 800, depth: 400, railWidth: 0, interior, ...patch });

  it('ara dikme, ara tabla, önler, çekmece kutusu ve hırdavat', () => {
    const r = computeCabinet(cab(twoCols()));
    const byId = (id: string) => r.parts.find((p) => p.id === id);
    expect(byId('div-0')).toMatchObject({ name: 'Ara Dikme', length: 764 });
    expect(byId('part-2A')).toMatchObject({ name: 'Ara Tabla 2A', length: 546 });
    expect(byId('door-1A')).toMatchObject({ length: 797, width: 424, quantity: 1 });
    expect(byId('drawer-front-2A')).toMatchObject({ length: 570, width: 224 });
    expect(byId('drawer-side-2A')).toBeDefined();
    expect(r.hardware.find((h) => h.key === 'hinge')?.quantity).toBe(2);
    expect(r.hardware.find((h) => h.key === 'rail')?.quantity).toBe(1);
    expect(r.hardware.find((h) => h.key === 'handle')?.quantity).toBe(2);
    expect(r.doorCount).toBe(0); // düz dolap kapakları devre dışı
    expect(r.interior?.cells).toHaveLength(3);
  });

  it('sabit ve hareketli raflar, askı', () => {
    const it: CabinetInterior = {
      columns: [
        newColumn([newCell('open', { shelves: [200, 400], shelfType: 'fixed' })], 400),
        newColumn([newCell('door', { shelves: [300], rod: true })]),
      ],
    };
    const r = computeCabinet(cab(it));
    expect(r.parts.find((p) => p.id === 'shelf-1A')).toMatchObject({ name: 'Sabit Raf 1A', quantity: 2, length: 400, width: r.innerDepth });
    expect(r.parts.find((p) => p.id === 'shelf-2A')).toMatchObject({ name: 'Hareketli Raf 2A', quantity: 1, length: 544 });
    expect(r.hardware.find((h) => h.key === 'shelf_pin')?.quantity).toBe(4);
    expect(r.hardware.find((h) => h.key === 'hanger_rod')).toBeDefined();
  });

  it('yukarı açılan kapak pistonlu; alçak çekmece gözü uyarır', () => {
    const it: CabinetInterior = { columns: [newColumn([newCell('drawer', { height: 80, drawerCount: 2 }), newCell('door', { opening: 'up' })])] };
    const r = computeCabinet(cab(it));
    expect(r.hardware.find((h) => h.key === 'gas_strut')?.quantity).toBe(2);
    expect(r.warnings.some((w) => w.ruleId === 'VAL_DRAWER_LOW')).toBe(true);
  });

  it('ayaklı dolap: gövde ayak kadar kısa, ayak hırdavatı', () => {
    const r = computeCabinet(cab(twoCols(), { legHeight: 150 }));
    expect(r.legHeight).toBe(150);
    expect(r.parts.find((p) => p.id === 'side-right')?.length).toBe(650);
    expect(r.hardware.find((h) => h.key === 'leg')).toMatchObject({ name: 'Mobilya Ayağı 150mm', quantity: 4 });
    expect(r.hardware.filter((h) => h.key === 'leg')).toHaveLength(1);
  });

  it('fotoğraftaki ünite şablonu geçerli', () => {
    const tpl = COMPOSITION_TEMPLATES.find((t) => t.id === 'tv-photo')!;
    for (const b of tpl.boxes) {
      const r = computeCabinet(cab(b.interior!(), { width: b.width, height: b.height, depth: b.depth, legHeight: b.legHeight ?? 0, doorOverlayType: 'inset' }));
      expect(r.warnings.filter((w) => w.severity === 'error')).toEqual([]);
    }
  });

  it('şablondaki üst dolabın iki kalkar kapağı eşit (ortak dikmeyle)', () => {
    const tpl = COMPOSITION_TEMPLATES.find((t) => t.id === 'tv-photo')!;
    const b = tpl.boxes[2];
    const r = computeCabinet(cab(b.interior!(), { width: b.width, height: b.height, depth: b.depth, doorOverlayType: 'inset' }), { omitLeftSide: true });
    const doors = r.interior!.fronts;
    expect(doors).toHaveLength(2);
    expect(doors[0].rect.w).toBe(doors[1].rect.w);
  });
});

describe('kapağın arkasındaki dikmeler', () => {
  const oneDoor = (): CabinetInterior => ({ columns: [newColumn([newCell('door')])] });
  const twoDoors = (side: 'left' | 'right' | null): CabinetInterior => setDividerBehind(0, side)({
    columns: [newColumn([newCell('door')], 473), newColumn([newCell('door')])],
  }, frame());

  it('gömme kapakta yan dikme arkadaysa kapak dikmenin kalınlığı kadar büyür', () => {
    const plain = layoutInterior(oneDoor(), frame({ inset: true })).fronts[0].rect;
    const behind = layoutInterior(oneDoor(), frame({ inset: true, leftBehind: true })).fronts[0].rect;
    expect(plain).toMatchObject({ x: 21, w: 958 });
    expect(behind).toMatchObject({ x: 3, w: 976 }); // 958 + 18
    const both = layoutInterior(oneDoor(), frame({ inset: true, leftBehind: true, rightBehind: true })).fronts[0].rect;
    expect(both.w).toBe(994);
  });

  it('ortak sol dikmede işaret yok sayılır', () => {
    const g = layoutInterior(oneDoor(), frame({ inset: true, leftBehind: true, omitLeft: true }));
    expect(g.fronts[0].rect.x).toBe(3); // iç açıklık zaten 0'dan başlar
    expect(interiorFrameOf({ ...DEFAULT_CABINET, leftSideBehind: true }, { omitLeftSide: true }).leftBehind).toBe(false);
  });

  it('ara dikmeyi soldaki ya da sağdaki kapak örter', () => {
    const plain = layoutInterior(twoDoors(null), frame({ inset: true })).fronts.map((x) => [x.rect.x, x.rect.w]);
    expect(plain).toEqual([[21, 467], [512, 467]]);
    const left = layoutInterior(twoDoors('left'), frame({ inset: true }));
    expect(left.dividers[0].behind).toBe('left');
    expect(left.fronts.map((x) => [x.rect.x, x.rect.w])).toEqual([[21, 488], [512, 467]]); // dikme + derz kadar büyür
    const right = layoutInterior(twoDoors('right'), frame({ inset: true }));
    expect(right.fronts.map((x) => [x.rect.x, x.rect.w])).toEqual([[21, 467], [491, 488]]);
  });

  it('bindirme kapakta ara dikmenin tamamını örten taraf seçilir', () => {
    const g = layoutInterior(twoDoors('left'), frame());
    expect(g.fronts.map((x) => [x.rect.x, x.rect.w])).toEqual([[1.5, 506], [510.5, 488]]);
  });

  it('örten bölmede açık göz varsa bilgi verir', () => {
    const it2 = setDividerBehind(0, 'left')({ columns: [newColumn([newCell('open')], 473), newColumn([newCell('door')])] }, frame());
    expect(layoutInterior(it2, frame({ inset: true })).warnings.some((w) => w.ruleId === 'INFO_BEHIND_OPEN_CELL')).toBe(true);
  });

  it('kesim listesinde ara dikme geri çekilir, ön kenarı bantlı kalır', () => {
    const mk = (side: 'left' | null) => computeCabinet({ ...DEFAULT_CABINET, type: 'custom', width: 1000, height: 800, depth: 400, railWidth: 0, doorOverlayType: 'inset', interior: twoDoors(side) });
    const plain = mk(null).parts.find((p) => p.id === 'div-0')!;
    const behind = mk('left').parts.find((p) => p.id === 'div-0')!;
    expect(behind.name).toBe('Ara Dikme (kapak arkasında)');
    expect(behind.width).toBe(plain.width - 20); // kapak kalınlığı + 2mm
    expect(behind.bands.top).toBeGreaterThan(0);
  });

  it('son bölmenin sağında ara dikme yok', () => {
    const r = setDividerBehind(1, 'left')(twoCols(), frame());
    expect(r.columns.some((c) => c.dividerBehind)).toBe(false);
  });
});
