export interface RuleInfo {
  id: string;
  title: string;
  description: string;
  tip?: string;
}

export const RULES: Record<string, RuleInfo> = {
  RULE_BOTTOM_WIDTH_SIDES_OUT: {
    id: 'RULE_BOTTOM_WIDTH_SIDES_OUT',
    title: 'Taban Genişliği (Yanlar Dışta)',
    description: 'Taban, iki yan dikmenin arasına girer. Genişlik = Dış genişlik − 2 × gövde kalınlığı.',
    tip: 'Taban = W − 2t. Örn: 800 − 36 = 764 mm.',
  },
  RULE_BOTTOM_WIDTH_SIDES_IN: {
    id: 'RULE_BOTTOM_WIDTH_SIDES_IN',
    title: 'Taban Genişliği (Yanlar İçte)',
    description: 'Yanlar tabanın üstüne oturur. Taban tam dış genişliktedir.',
  },
  RULE_SIDE_HEIGHT: {
    id: 'RULE_SIDE_HEIGHT',
    title: 'Yan Dikme Yüksekliği',
    description: 'Yan dikme yüksekliği = gövde dış yüksekliği.',
  },
  RULE_SIDE_DEPTH_ROUTED: {
    id: 'RULE_SIDE_DEPTH_ROUTED',
    title: 'Yan Dikme Derinliği (Kanallı)',
    description: 'Kanallı arkalıkta yan dikme derinliği değişmez, arkalık kanala girer.',
  },
  RULE_SIDE_DEPTH_NAILED: {
    id: 'RULE_SIDE_DEPTH_NAILED',
    title: 'Yan Dikme Derinliği (Çakma)',
    description: 'Çakma arkalıkta yan dikme derinliği = D − arkalık kalınlığı.',
  },
  RULE_RAIL_WIDTH: {
    id: 'RULE_RAIL_WIDTH',
    title: 'Kuşak Genişliği',
    description: 'Kuşak genişliği = taban genişliği ile aynı formül (iki yan dikme arası).',
    tip: 'Kuşak = W − 2t. Ön ve arka olmak üzere 2 adet.',
  },
  RULE_BACK_WIDTH_ROUTED: {
    id: 'RULE_BACK_WIDTH_ROUTED',
    title: 'Arkalık Genişliği (Kanallı)',
    description: 'Arkalık iç ölçü + 2×(kanal derinliği − 1) mm.',
    tip: 'Arkalık kanal içine girmeli ama 1mm boşluk bırakılır.',
  },
  RULE_INNER_DEPTH: {
    id: 'RULE_INNER_DEPTH',
    title: 'İç Kullanılabilir Derinlik',
    description: 'İç derinlik = D − g (kanal uzaklığı) − arkalık kalınlığı.',
  },
  RULE_ADJ_SHELF_WIDTH: {
    id: 'RULE_ADJ_SHELF_WIDTH',
    title: 'Hareketli Raf Genişliği',
    description: 'Hareketli raf = iç genişlik − 2mm oyun payı.',
    tip: 'Raf = iç genişlik − 2. Sıkı olmasın, rahat takılsın.',
  },
  RULE_ADJ_SHELF_DEPTH: {
    id: 'RULE_ADJ_SHELF_DEPTH',
    title: 'Hareketli Raf Derinliği',
    description: 'Hareketli raf derinliği = iç derinlik − öne çekme payı (varsayılan 20mm).',
    tip: 'Raf kapağa değmemeli, 20mm geri çekilir.',
  },
  RULE_FIXED_SHELF_WIDTH: {
    id: 'RULE_FIXED_SHELF_WIDTH',
    title: 'Sabit Raf Genişliği',
    description: 'Sabit raf = iç genişlik (oyun payı yok, sıkı oturur).',
  },
  RULE_DOOR_FULL_WIDTH: {
    id: 'RULE_DOOR_FULL_WIDTH',
    title: 'Tam Bindirme Kapak Genişliği',
    description: 'Kapak genişliği = W ÷ kapak sayısı − derz.',
    tip: 'Tek kapak: W − 3. Çift kapak: W/2 − 3.',
  },
  RULE_DOOR_FULL_HEIGHT: {
    id: 'RULE_DOOR_FULL_HEIGHT',
    title: 'Tam Bindirme Kapak Yüksekliği',
    description: 'Kapak yüksekliği = H − derz.',
    tip: 'Kapak = H − 3. Derzi eşit bölmek için üst ve alt 1.5mm.',
  },
  RULE_DRAWER_BOX_WIDTH: {
    id: 'RULE_DRAWER_BOX_WIDTH',
    title: 'Çekmece Kutusu Genişliği',
    description: 'Çekmece kutusu = iç genişlik − ray düşümü.',
    tip: 'Bilyalı ray: iç − 25.4 (≈26). Her tarafa 12.7mm ray.',
  },
  RULE_BEST_RAIL_LENGTH: {
    id: 'RULE_BEST_RAIL_LENGTH',
    title: 'Ray Boyu Seçimi',
    description: 'İç derinlikten küçük en büyük standart ray boyu seçilir.',
    tip: 'Standart boylar: 250–600mm arası, 50mm adımlarla.',
  },
  RULE_HINGE_COUNT: {
    id: 'RULE_HINGE_COUNT',
    title: 'Menteşe Sayısı',
    description: 'Kapak yüksekliğine göre menteşe sayısı belirlenir. Geniş veya ağır kapaklarda +1.',
    tip: '≤900mm: 2, ≤1600mm: 3, ≤2000mm: 4, >2000mm: 5 adet.',
  },
  RULE_EDGE_BAND_DEDUCTION: {
    id: 'RULE_EDGE_BAND_DEDUCTION',
    title: 'Bant Düşme Kuralı',
    description: 'Bant kalınlığı eşik değerin üzerindeyse kesim ölçüsünden düşülür.',
    tip: '≥0.8mm bantta düşüm yapılır. 0.4mm ince bantta düşüm yok.',
  },
  VAL_SHELF_DEFLECTION: {
    id: 'VAL_SHELF_DEFLECTION',
    title: 'Raf Sehimi',
    description: 'Raf sehimi δ = 5wL⁴/(384EI) formülüyle hesaplanır. Sınır: L/300.',
    tip: 'Sehim fazlaysa: orta dikme ekle, 25mm raf kullan veya önden kuşak ekle.',
  },
  VAL_EXCEEDS_SHEET: {
    id: 'VAL_EXCEEDS_SHEET',
    title: 'Plaka Ebadı Aşımı',
    description: 'Parça boyutu plaka ebadını aşıyor.',
  },
  VAL_GRAIN_VIOLATION: {
    id: 'VAL_GRAIN_VIOLATION',
    title: 'Damar Yönü İhlali',
    description: 'Parça damarlı malzemede damar yönüne ters yerleştirilmiş.',
  },
  VAL_HINGE_INSUFFICIENT: {
    id: 'VAL_HINGE_INSUFFICIENT',
    title: 'Yetersiz Menteşe',
    description: 'Kapak yüksekliği/ağırlığına göre menteşe sayısı yetersiz.',
  },
  VAL_RAIL_EXCEEDS_DEPTH: {
    id: 'VAL_RAIL_EXCEEDS_DEPTH',
    title: 'Ray Boyu Aşımı',
    description: 'Ray boyu iç derinliği aşıyor.',
  },
  VAL_OBSTACLE_CLASH: {
    id: 'VAL_OBSTACLE_CLASH',
    title: 'Engel Çakışması',
    description: 'Modül bir engelle (priz, su, pencere vb.) çakışıyor.',
  },
  VAL_CORNER_CLASH: {
    id: 'VAL_CORNER_CLASH',
    title: 'Köşe Çarpışması',
    description: 'Köşe dolabında kapak veya kulp çarpışması var.',
  },
  VAL_COOKTOP_HOOD_GAP: {
    id: 'VAL_COOKTOP_HOOD_GAP',
    title: 'Ocak-Aspiratör Mesafesi',
    description: 'Tezgah (ocak) ile aspiratör arası mesafe yetersiz.',
  },
  VAL_HINGE_RAIL_CLASH: {
    id: 'VAL_HINGE_RAIL_CLASH',
    title: 'Menteşe-Ray Çakışması',
    description: 'Menteşe ile çekmece rayı aynı yüksekliğe denk geliyor.',
  },
};
