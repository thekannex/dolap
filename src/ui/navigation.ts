import { MapPin, PenTool, Shapes, Box, CookingPot, Warehouse, Armchair, Ruler } from 'lucide-react';
import type { JobKind } from '../core/models/project';
import type { PageId } from '../stores/ui-store';

export interface Step { id: PageId; label: string; icon: typeof MapPin; hint: string }

/** Her iş türünün adımları (üst menüde sırayla görünür). */
export const JOB_STEPS: Record<JobKind, Step[]> = {
  kitchen: [
    { id: 'wall-survey', label: 'Duvar ölçüsü', icon: Ruler, hint: 'Duvar ölçüsü, yan duvar açıları, tavan ve zemin farkları, engeller' },
    { id: 'wall-layout', label: 'Yerleşim', icon: MapPin, hint: 'Cihazlar ve otomatik alt/üst dolap önerisi' },
    { id: 'editor', label: 'Dolaplar', icon: PenTool, hint: 'Dolapları tek tek ayarlayın' },
  ],
  built_in: [
    { id: 'wall-survey', label: 'Duvar ölçüsü', icon: Ruler, hint: 'Duvar ölçüsü, yan duvar açıları, tavan ve zemin farkları, engeller' },
    { id: 'wall-shape', label: 'Şekil ve alan', icon: Box, hint: 'Kolon, kiriş, çıkıntı ve dolap alanı' },
    { id: 'composer', label: 'Dolap düzeni', icon: Shapes, hint: 'Kutuları, rafları ve kapakları düzenleyin' },
    { id: 'editor', label: 'Dolaplar', icon: PenTool, hint: 'Kutuları tek tek ayrıntılı ayarlayın' },
  ],
  furniture: [
    { id: 'composer', label: 'Çizim', icon: Shapes, hint: 'Üniteyi çizin ya da şablondan başlayın' },
    { id: 'editor', label: 'Dolaplar', icon: PenTool, hint: 'Kutuları tek tek ayrıntılı ayarlayın' },
  ],
};

export const JOB_ICONS: Record<JobKind, typeof MapPin> = { kitchen: CookingPot, built_in: Warehouse, furniture: Armchair };

/** İşe bağlı sayfalar; diğerleri (proje, kesim, 3D, ayarlar) tüm projeye aittir. */
export const JOB_PAGES: ReadonlySet<PageId> = new Set(['wall-survey', 'wall-layout', 'wall-shape', 'composer', 'editor']);

export const firstStep = (kind: JobKind): PageId => JOB_STEPS[kind][0].id;
