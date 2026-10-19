import { Square, DoorOpen, Plug, Droplets, ArrowDown, Flame, Cylinder, MoreHorizontal, WashingMachine, RectangleVertical, RectangleHorizontal, Box, SquareDashed } from 'lucide-react';

/** Engel tipleri; size = [en, yerden yükseklik, boy] varsayılanları (mm). */
export const OBSTACLE_TYPES: Array<{ value: string; label: string; icon: typeof Square; size: [number, number, number]; shape?: boolean }> = [
  { value: 'column', label: 'Kolon', icon: RectangleVertical, size: [400, 0, 2600], shape: true },
  { value: 'beam', label: 'Kiriş', icon: RectangleHorizontal, size: [3000, 2300, 300], shape: true },
  { value: 'protrusion', label: 'Çıkıntı / şaft', icon: Box, size: [300, 0, 2600], shape: true },
  { value: 'recess', label: 'Girinti', icon: SquareDashed, size: [800, 0, 2100], shape: true },
  { value: 'appliance', label: 'Cihaz boşluğu', icon: WashingMachine, size: [600, 0, 820] },
  { value: 'window', label: 'Pencere', icon: Square, size: [1000, 900, 1200] },
  { value: 'door', label: 'Kapı', icon: DoorOpen, size: [800, 0, 2100] },
  { value: 'outlet', label: 'Priz', icon: Plug, size: [80, 1100, 80] },
  { value: 'water_inlet', label: 'Su girişi', icon: Droplets, size: [100, 500, 100] },
  { value: 'drain', label: 'Tahliye', icon: ArrowDown, size: [100, 400, 100] },
  { value: 'gas', label: 'Doğalgaz', icon: Flame, size: [100, 600, 100] },
  { value: 'pipe', label: 'Boru', icon: Cylinder, size: [60, 0, 2500] },
  { value: 'custom', label: 'Diğer', icon: MoreHorizontal, size: [200, 0, 200] },
];

export function obstacleInfo(type: string) {
  return OBSTACLE_TYPES.find((t) => t.value === type) ?? OBSTACLE_TYPES[OBSTACLE_TYPES.length - 1];
}
