# Dolap

Mobilya ve mutfak dolabı için ölçü çıkarma, kesim listesi, plaka kesim planı ve müşteri teklifi hazırlayan Windows masaüstü uygulaması.

## Kullanıcı için

### Kurulum

`release/` klasöründe iki dosya bulunur:

| Dosya | Ne zaman |
|---|---|
| `Dolap-Kurulum-1.0.0.exe` | Normal kurulum. Masaüstü ve Başlat menüsü kısayolu oluşturur. |
| `Dolap-Tasinabilir-1.0.0.exe` | Kurulumsuz. Çift tıklayınca çalışır, USB bellekten de açılabilir. |

Uygulama imzasız olduğu için Windows ilk açılışta "Windows bilgisayarınızı korudu" uyarısı gösterebilir. **Ek bilgi → Yine de çalıştır** ile açılır.

Bilgisayarda Node.js ya da başka bir program kurulu olması gerekmez; internet bağlantısı da gerekmez.

### İş akışı

1. **Proje**: Yeni proje oluşturun (proje adı, müşteri). Telefon, adres ve teklif notu da girilebilir.
2. **Duvar Yerleşimi**: Duvarın alttan, ortadan ve üstten genişliğini girin. Bulaşık makinesi, fırın gibi cihazları "Cihaz boşluğu" olarak ekleyin. **Öneriyi uygula** ile alt ve üst dolaplar otomatik yerleşir, kalan boşluğa dolgu konur.
3. **Dolaplar**: Her dolabı ayrı düzenleyin: tip, ölçü, gövde yapısı, kapak (tam, yarım bindirme ya da gömme), raf, çekmece ve ray tipi. Parçanın üzerine gelince ölçüsünün hangi formülle bulunduğu görünür.
4. **Kesim ve Teklif**: Levha türüne göre kesim listesi, plaka yerleşim çizimleri, hırdavat, kenar bandı metrajı ve maliyet hesaplanır.
   - **Atölye PDF**: Kesim listesi, plaka planları, hırdavat, bant ve maliyet dökümü.
   - **Teklif PDF**: Müşteriye verilecek dolap listesi ve KDV dahil toplam fiyat.
   - **Excel**: Bütün tablolar ayrı sayfalarda.
   - **DXF**: Plaka kesim planı (CNC ya da ebatlama için).
5. **Ayarlar**: Atölye adı ve iletişim bilgileri (PDF başlığında görünür), plaka ölçüsü, testere payı, bant kalınlıkları, levha, bant ve hırdavat fiyatları, işçilik, kâr oranı ve KDV.

### Kayıt ve yedek

- Projeler her değişiklikte otomatik kaydedilir ve uygulama açılınca son proje açılır.
- Veriler bu bilgisayarda, kullanıcı klasöründe saklanır. Klasörü **Dosya → Verilerin bulunduğu klasörü aç** menüsünden açabilirsiniz.
- **Yedek al** düğmesi projeyi `.dolap.json` dosyası olarak kaydeder. Başka bir bilgisayarda **Yedekten aç** ile açılır. Düzenli yedek almanız önerilir.

### Bilinmesi gerekenler

- Kesim listesindeki ölçüler **bitmiş (bant dahil)** ölçüdür. Bant düşümünü kesimi yapan tedarikçi uygular.
- Metal çekmece kutusu (taban ve arka) ölçüleri genel bir formülle hesaplanır; kullandığınız markanın kataloğundan doğrulayın.
- Hırdavat ve fiyatlar varsayılan olarak sıfırdır. Teklif vermeden önce **Ayarlar** sayfasından girin.

## Geliştirici için

Gerekenler: Node.js 22 veya üstü.

```bash
npm install
npm run dev        # tarayıcıda geliştirme sunucusu (http://localhost:5173)
npm run app        # derleyip Electron penceresinde açar
npm test           # birim testleri
npm run lint
npm run dist       # test + derleme + Windows kurulum dosyası ve taşınabilir exe (release/)
npm run icons      # public/favicon.svg dosyasından build/icon.png üretir
```

### Yapı

```
electron/main.cjs        Electron ana süreci (pencere, menü, "Farklı kaydet")
src/core/engine          Dolap hesapları (saf fonksiyonlar, test edilir)
  compute-cabinet.ts     Bir dolabın tüm parça, hırdavat ve uyarıları
  cabinet-factory.ts     Dolap tipleri ve varsayılanları
src/core/project         Proje geneli hesap: levha grupları, plaka planı, bant, maliyet, teklif
src/core/optimizer       Giyotin plaka yerleşimi (birkaç strateji dener, en az plakayı seçer)
src/core/layout          Duvar planlama ve görünüş yerleşimi
src/core/export          PDF (DejaVu Sans gömülü), Excel, DXF
src/core/persistence     IndexedDB kaydı ve .dolap.json içe/dışa aktarma
src/stores               Zustand store'ları ve otomatik kayıt
src/ui                   React arayüzü
src/tests                Vitest testleri
```

PDF'lerde Türkçe karakterler için [DejaVu Sans](src/assets/fonts/DejaVu-LICENSE.txt) yazı tipi gömülüdür.
