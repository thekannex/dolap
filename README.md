# Dolap

Mobilya ve mutfak dolabı için ölçü çıkarma, kesim listesi, plaka kesim planı ve müşteri teklifi hazırlayan Windows masaüstü uygulaması.

Mutfak dolaplarının (alt, üst, boy, çekmeceli, evye) yanında gardırop, kitaplık, ayakkabılık, şifonyer, TV ünitesi gibi bağımsız mobilyalar ve serbest ölçülü dolaplar da hazırlanabilir. Kapaklar yana ya da yukarı (kalkar/katlanır) açılabilir.

## Kullanıcı için

### Kurulum

`release/` klasöründe iki dosya bulunur:

| Dosya | Ne zaman |
|---|---|
| `Dolap-Kurulum-1.10.0.exe` | Normal kurulum. Masaüstü ve Başlat menüsü kısayolu oluşturur. |
| `Dolap-Tasinabilir-1.10.0.exe` | Kurulumsuz. Çift tıklayınca çalışır, USB bellekten de açılabilir. |

Uygulama imzasız olduğu için Windows ilk açılışta "Windows bilgisayarınızı korudu" uyarısı gösterebilir. **Ek bilgi → Yine de çalıştır** ile açılır.

Bilgisayarda Node.js ya da başka bir program kurulu olması gerekmez; internet bağlantısı da gerekmez.

### İş akışı

1. **Proje**: Yeni proje oluşturun ve türünü seçin: **Mutfak** (duvar ölçüsüyle) ya da **Bağımsız mobilya** (duvarsız). Telefon, adres ve teklif notu da girilebilir.
2. **Duvar Yerleşimi**: Duvarın alttan, ortadan ve üstten genişliğini girin. Bulaşık makinesi, fırın gibi cihazları "Cihaz boşluğu" olarak ekleyin. **Öneriyi uygula** ile alt ve üst dolaplar otomatik yerleşir, kalan boşluğa dolgu konur.
3. **Dolaplar**: Önizlemede sağ ve üst kenardaki tutamaçlarla dolabı sürükleyerek boyutlandırın; bölmeli dolapta ara dikme, ara tabla ve rafları burada da sürükleyin, kenarlarda ölçüler canlı yazar. Hem burada hem serbest çizimde fare tekerleği yakınlaştırır, orta tuş ya da Boşluk + sürükle kaydırır, köşedeki düğmelerle ekrana sığdırılır. Her dolabı ayrı düzenleyin: tip, ölçü, gövde yapısı (üst ve alt tabla ayrı ayrı "dikmelerin arasında" ya da "dikmelerin üstünde/altında"; tam en tablanın yan kenarları bantlanır, dikme o kadar kısalır), kapak (tam, yarım bindirme ya da gömme), raf, çekmece ve ray tipi. Parçanın üzerine gelince ölçüsünün hangi formülle bulunduğu görünür. Evye dolabında hazır bir evye modeli seçilir ya da eldeki evyenin ölçüleri girilir; yönü (damlalık solda/sağda), tezgâh kesim yeri ve batarya deliği hesaplanır, "Tezgâh (üstten)" çiziminde ölçüleriyle görünür. Damlalık duvara ya da boy dolaba taşıyorsa program uyarır; duvarda su girişi tanımlıysa dolap ona hizalanabilir.
   - **Serbest Çizim**: TV ünitesi, kitaplık duvarı, gardırop gibi birden çok kutudan oluşan mobilyaları önden görünüşte fareyle çizin ya da ölçüyle kurun. Her kutunun içeriği (kapaklı, çekmeceli, açık raf, yukarı açılır, askılı, boş niş) ve yerden yüksekliği seçilir; bitişik kutularda "ortak dikme / ortak tabla" seçilirse o panel kesim listesinden düşer. Hazır şablonlarla da başlanabilir. "Bölmelere ayır" ile bir kutu dikey bölmelere (ara dikme) ve yatay gözlere (ara tabla) ayrılır; her göze tek/çift kapak, yukarı açılır kapak, çekmece (adetli) ya da açık raf verilir, raflar sabit ya da hareketli olur. Ara dikme, ara tabla ve raflar çizimde sürüklenerek taşınır (10 mm adımlarla); seçili kutunun kenarlarında bölme genişlikleri ve göz yükseklikleri canlı yazar. "Bölmeleri eşitle" ve "Gözleri eşitle" tek tıkla eşit aralık verir. Bölme listesinde bir bölmeyi tutamacından sürükleyip başka bir bölmenin üstüne bırakınca ikisi bir grup olur; araya bırakınca sırası değişir, grubun dışına bırakınca gruptan çıkar. "Bölmeleri eşitle" her grubu tek bölme sayar (grubun içindeki oran korunur); grubun içi "Grubu eşitle" ile ayrıca eşitlenir ya da bölmeler kendi aralarında serbestçe ayarlanır. Grubun toplam genişliği de ayrıca girilebilir. Kapak ve çekmece önleri kutu başına "dışarıda (bindirme)" ya da "içeride (gömme)" seçilir; kutuya ayak yüksekliği verilebilir. "Dikmeler ve tablalar" bölümündeki üstten görünüş şeridinde istediğiniz dikmeye tıklayıp onu kapağın arkasına alırsınız (iki kutunun birleştiği dış dikmeler için kullanışlıdır): kapak o dikmenin önünü de örter ve dikmenin kalınlığı kapak ölçüsüne eklenir. Ara dikmede ikinci tıklama örten kapağı sağdaki bölmeye geçirir, üçüncüsü işareti kaldırır. Gömme kapakta işaretli dikme kapak kalınlığı + 2 mm geride kesilir; kapak açılınca göründüğü için ön kenarı bantlanır. Aynı seçim Dolaplar sekmesinde "Gövde yapısı" altında da vardır.
4. **Kesim ve Teklif**: Levha türüne göre kesim listesi, plaka yerleşim çizimleri, hırdavat, kenar bandı metrajı ve maliyet hesaplanır.
   - **Atölye PDF**: Kesim listesi, tezgâh işlemleri (evye kesimi, batarya deliği), plaka planları, hırdavat, bant ve maliyet dökümü.
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
