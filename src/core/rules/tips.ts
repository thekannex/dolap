export interface PracticalTip {
  id: string;
  category: 'measurement' | 'assembly' | 'design' | 'material';
  title: string;
  content: string;
  relatedRuleIds: string[];
}

export const PRACTICAL_TIPS: PracticalTip[] = [
  {
    id: 'TIP_DOOR_SHORTCUT',
    category: 'design',
    title: 'Kapak Kısa Yolu',
    content: 'Kapak = gövde − 3; çift kapakta her biri = W/2 − 3.',
    relatedRuleIds: ['RULE_DOOR_FULL_WIDTH', 'RULE_DOOR_FULL_HEIGHT'],
  },
  {
    id: 'TIP_ADJ_SHELF',
    category: 'design',
    title: 'Hareketli Raf Kısa Yolu',
    content: 'Hareketli raf = iç genişlik − 2.',
    relatedRuleIds: ['RULE_ADJ_SHELF_WIDTH'],
  },
  {
    id: 'TIP_DRAWER_RAIL',
    category: 'design',
    title: 'Bilyalı Ray Çekmece',
    content: 'Bilyalı ray çekmece = iç genişlik − 26 (≈25.4).',
    relatedRuleIds: ['RULE_DRAWER_BOX_WIDTH'],
  },
  {
    id: 'TIP_WALL_MEASURE',
    category: 'measurement',
    title: 'Duvar Ölçüsü',
    content: 'Duvar ölçüsü alt, orta ve üst olmak üzere 3 noktadan alınır; EN KÜÇÜK değer esas alınır.',
    relatedRuleIds: [],
  },
  {
    id: 'TIP_SQUARE_CHECK',
    category: 'measurement',
    title: 'Gönye Kontrolü',
    content: 'Gönye kontrolü köşegen yöntemiyle (iki köşegen eşit olmalı) veya 3-4-5 kuralıyla yapılır.',
    relatedRuleIds: [],
  },
  {
    id: 'TIP_FIXED_FIRST',
    category: 'design',
    title: 'Önce Sabit Öğeler',
    content: 'Önce sabit öğeler (boy dolap, ankastre, evye, ocak) yerleştirilir, kalan uzunluk modüllere bölünür.',
    relatedRuleIds: [],
  },
  {
    id: 'TIP_FILLER',
    category: 'design',
    title: 'Dolgu Kullanımı',
    content: 'Kalan küçük farklar dolguyla kapatılır; gövde ölçüsü "kurtarmak" için bozulmaz.',
    relatedRuleIds: [],
  },
  {
    id: 'TIP_ALIGNMENT',
    category: 'design',
    title: 'Derz Hizası',
    content: 'Üst dolap derzleri alt dolap derzleriyle dikeyde hizalı olmalı (görsel kalite).',
    relatedRuleIds: [],
  },
  {
    id: 'TIP_GRAIN_MATCH',
    category: 'material',
    title: 'Damar Eşleme',
    content: 'Damarlı desende kapakların desen yönü aynı olmalı; optimizasyonda parça döndürme kapatılır.',
    relatedRuleIds: ['VAL_GRAIN_VIOLATION'],
  },
];
