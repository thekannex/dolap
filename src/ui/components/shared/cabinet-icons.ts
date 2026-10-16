import { Box, Columns, ArrowUpDown, Grip, Droplet, BookOpen, RectangleVertical, Shirt, Library, Footprints, Layers, Tv, Square } from 'lucide-react';
import type { CabinetType } from '../../../core/models/cabinet';

export const CABINET_TYPE_ICONS: Record<CabinetType, typeof Box> = {
  base: Box,
  wall: Columns,
  tall: ArrowUpDown,
  drawer_base: Grip,
  sink: Droplet,
  open_shelf: BookOpen,
  filler: RectangleVertical,
  wardrobe: Shirt,
  bookcase: Library,
  shoe_cabinet: Footprints,
  dresser: Layers,
  tv_unit: Tv,
  custom: Square,
};
