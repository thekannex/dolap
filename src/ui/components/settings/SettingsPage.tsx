import { RotateCcw } from 'lucide-react';
import { useSettingsStore } from '../../../stores/settings-store';
import { useUIStore } from '../../../stores/ui-store';
import type { AppSettings } from '../../../core/models/settings';
import type { HardwareKey, PartMaterial } from '../../../core/engine/compute-cabinet';
import { formatNumber } from '../../../core/utils/format';
import { Button, Card, NumInput, TextInput } from '../shared/ui';

const MATERIAL_LABELS: Record<PartMaterial, string> = {
  body: 'Gövde levhası',
  front: 'Kapak / klapa levhası',
  back: 'Arkalık ve çekmece tabanı',
};

const HARDWARE_LABELS: Record<HardwareKey, string> = {
  hinge: 'Menteşe (adet)',
  rail: 'Çekmece rayı (çift)',
  metal_drawer: 'Metal çekmece seti (takım)',
  confirmat: 'Konfirmat vida (adet)',
  shelf_pin: 'Raf pimi (adet)',
  leg: 'Dolap ayağı (adet)',
  handle: 'Kulp (adet)',
  gas_strut: 'Kapak amortisörü / piston (adet)',
  lift_system: 'Katlanır kapak mekanizması (takım)',
  hanger_rod: 'Askı borusu, taşıyıcılı (adet)',
};

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.updateSettings);
  const reset = useSettingsStore((s) => s.resetSettings);
  const confirm = useUIStore((s) => s.confirm);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => update({ [key]: value } as Partial<AppSettings>);
  const bandKeys = [...new Set([...Object.keys(settings.bandPrices), String(settings.bodyBand), String(settings.frontBand)])]
    .sort((a, b) => Number(a) - Number(b));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Ayarlar</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Tüm projelerde geçerlidir; değişiklikler otomatik kaydedilir.</p>
          </div>
          <Button variant="ghost" onClick={async () => {
            if (await confirm({ title: 'Ayarlar sıfırlansın mı?', message: 'Atölye bilgileri ve tüm fiyatlar varsayılana döner.', confirmLabel: 'Sıfırla', danger: true })) reset();
          }}><RotateCcw size={14} /> Varsayılana dön</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Atölye bilgileri (PDF başlığında görünür)">
            <div className="p-4 flex flex-col gap-3">
              <TextInput label="Atölye / firma adı" value={settings.workshopName} onChange={(v) => set('workshopName', v)} placeholder="Örn: Usta Mobilya" />
              <TextInput label="Telefon" value={settings.workshopPhone} onChange={(v) => set('workshopPhone', v)} />
              <TextInput label="Adres" value={settings.workshopAddress} onChange={(v) => set('workshopAddress', v)} />
            </div>
          </Card>

          <Card title="Plaka ve kesim">
            <div className="p-4 grid grid-cols-2 gap-3">
              <NumInput label="Plaka boyu" value={settings.sheetWidth} onChange={(v) => set('sheetWidth', v)} min={500} max={6000} />
              <NumInput label="Plaka eni" value={settings.sheetHeight} onChange={(v) => set('sheetHeight', v)} min={500} max={3000} />
              <NumInput label="Testere payı" value={settings.sawKerf} onChange={(v) => set('sawKerf', v)} max={10} step={0.5} />
              <NumInput label="Kenar kırpma" value={settings.edgeTrim} onChange={(v) => set('edgeTrim', v)} max={50} />
            </div>
          </Card>

          <Card title="Kenar bandı">
            <div className="p-4 grid grid-cols-3 gap-3">
              <NumInput label="Gövde bandı" value={settings.bodyBand} onChange={(v) => set('bodyBand', v)} max={3} step={0.1} />
              <NumInput label="Kapak bandı" value={settings.frontBand} onChange={(v) => set('frontBand', v)} max={3} step={0.1} />
              <NumInput label="Bant firesi" value={settings.bandWastePercent} onChange={(v) => set('bandWastePercent', v)} max={100} suffix="%" />
            </div>
          </Card>

          <Card title="Teklif">
            <div className="p-4 grid grid-cols-2 gap-3">
              <NumInput label="İşçilik (dolap başına)" value={settings.laborPerCabinet} onChange={(v) => set('laborPerCabinet', v)} max={1_000_000} suffix="₺" />
              <NumInput label="Kâr oranı" value={settings.profitPercent} onChange={(v) => set('profitPercent', v)} max={500} suffix="%" />
              <NumInput label="KDV" value={settings.vatPercent} onChange={(v) => set('vatPercent', v)} max={100} suffix="%" />
              <NumInput label="Teklif geçerliliği" value={settings.quoteValidityDays} onChange={(v) => set('quoteValidityDays', Math.round(v))} min={1} max={365} suffix="gün" />
            </div>
          </Card>

          <Card title="Levha fiyatları (tam plaka)">
            <div className="p-4 flex flex-col gap-3">
              {(Object.keys(MATERIAL_LABELS) as PartMaterial[]).map((m) => (
                <div key={m} className="grid grid-cols-[1fr_130px] gap-2 items-end">
                  <TextInput label={MATERIAL_LABELS[m]} value={settings.materials[m].name}
                    onChange={(v) => set('materials', { ...settings.materials, [m]: { ...settings.materials[m], name: v } })} />
                  <NumInput label="Plaka fiyatı" value={settings.materials[m].pricePerSheet}
                    onChange={(v) => set('materials', { ...settings.materials, [m]: { ...settings.materials[m], pricePerSheet: v } })} max={1_000_000} suffix="₺" />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Bant ve hırdavat fiyatları">
            <div className="p-4 grid grid-cols-2 gap-3">
              {bandKeys.map((k) => (
                <NumInput key={k} label={`Bant ${formatNumber(Number(k))} mm (metre)`} value={settings.bandPrices[k] ?? 0}
                  onChange={(v) => set('bandPrices', { ...settings.bandPrices, [k]: v })} max={100_000} suffix="₺" />
              ))}
              {(Object.keys(HARDWARE_LABELS) as HardwareKey[]).map((k) => (
                <NumInput key={k} label={HARDWARE_LABELS[k]} value={settings.hardwarePrices[k]}
                  onChange={(v) => set('hardwarePrices', { ...settings.hardwarePrices, [k]: v })} max={100_000} step={0.5} suffix="₺" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
