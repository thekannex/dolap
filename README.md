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

Her sayfanın sol alt köşesindeki **?** düğmesi o sayfayı tanıtır: alanlar sırayla vurgulanır ve balonlarda ne işe yaradıkları anlatılır. İleri / Geri düğmeleri ya da ok tuşlarıyla ilerlenir, Esc ile kapatılır; istediğiniz zaman yeniden açabilirsiniz. Henüz bakılmamış sayfalarda düğmenin üstünde turuncu bir nokta yanıp söner.

1. **Projeler ve Proje**: Üst menüdeki **Projeler** sekmesi kayıtlı tüm projeleri listeler; açık proje kapanmadan buradan başka projeye geçilir (açık olan önce kaydedilir), yeni proje oluşturulur, yedekten açılır, çoğaltılır ya da silinir. **Proje** sekmesi açık projenin bilgilerini ve işlerini gösterir. Müşteri bilgilerini girin. Bir proje, aynı müşterinin birden çok **işini** taşır (örneğin mutfak + kiler + TV ünitesi); kesim listesi ve teklif hepsini birlikte ya da iş iş hesaplar. Proje sayfasından "Yeni iş ekle" ile üç türden biri seçilir. Üst menüde açık işin adı ve yalnızca o işe ait adımlar görünür; iş seçiciyle işler arasında geçilir.
2. **Mutfak işi**
   - **1 · Duvar ve yerleşim**: Duvarın alttan, ortadan ve üstten genişliğini girin. Bulaşık makinesi, fırın gibi cihazları "Cihaz boşluğu" olarak ekleyin. **Öneriyi uygula** ile alt ve üst dolaplar otomatik yerleşir, kalan boşluğa dolgu konur.
   - **2 · Dolaplar**: dolapları tek tek ayarlayın (aşağıya bakın).
3. **Duvar dolabı işi** (kiler, gömme gardırop, boydan boya dolap)
   - **1 · Duvar ve şekil**: Duvar ölçüsünü girin. Duvardaki kolon, kiriş, çıkıntı (şaft) ve girintiyi ekleyip 3B sahnede sürükleyerek yerleştirin; ölçü ve "derinlik" (duvardan ne kadar taştığı) yandan girilir. "Dolap alanı çiz" ile duvarın üstünde sürükleyerek ya da "Boydan boya" ile dolabın kaplayacağı alanı verin. Program alanı engellere göre kutulara böler: önler tek hizada kalır, çıkıntının önüne sığ dolap, yer kalmayan yere dolgu paneli gelir; kirişin altında dolap kısalır, önünde sığ üst kutu oluşur; pencere ve kapının önü boş kalır. Geniş bölümler "En geniş modül" ölçüsüne göre eşit kutulara ayrılır, "Üst kutu yüksekliği" verilirse üstte ayrı asma kutular çıkar. Sonuç canlı önizlenir; "Dolabı oluştur" ile serbest çizim kompozisyonu olarak kurulur ve oradan kutu kutu düzenlenir. Duvar şekli değişirse "dolabını yenile" ile yeniden üretilir.
   - **2 · Dolap düzeni**: Oluşan kutular duvarın şekli arka planda görünerek düzenlenir; her kutunun rafları, kapakları, çekmeceleri ve bölmeleri sağ panelden doğrudan ayarlanır.
   - **3 · Dolaplar**: kutuları tek tek ayrıntılı ayarlayın.
4. **Bağımsız ünite işi** (TV ünitesi, kitaplık, gardırop, şifonyer)
   - **1 · Çizim**: TV ünitesi, kitaplık duvarı, gardırop gibi birden çok kutudan oluşan mobilyaları önden görünüşte fareyle çizin ya da ölçüyle kurun. Her kutunun içeriği (kapaklı, çekmeceli, açık raf, yukarı açılır, askılı, boş niş) ve yerden yüksekliği seçilir; bitişik kutularda "ortak dikme / ortak tabla" seçilirse o panel kesim listesinden düşer. Hazır şablonlarla da başlanabilir. "Bölmelere ayır" ile bir kutu dikey bölmelere (ara dikme) ve yatay gözlere (ara tabla) ayrılır; her göze tek/çift kapak, yukarı açılır kapak, çekmece (adetli) ya da açık raf verilir, raflar sabit ya da hareketli olur. Ara dikme, ara tabla ve raflar çizimde sürüklenerek taşınır (10 mm adımlarla); seçili kutunun kenarlarında bölme genişlikleri ve göz yükseklikleri canlı yazar. "Bölmeleri eşitle" ve "Gözleri eşitle" tek tıkla eşit aralık verir. Bölme listesinde bir bölmeyi tutamacından sürükleyip başka bir bölmenin üstüne bırakınca ikisi bir grup olur; araya bırakınca sırası değişir, grubun dışına bırakınca gruptan çıkar. "Bölmeleri eşitle" her grubu tek bölme sayar (grubun içindeki oran korunur); grubun içi "Grubu eşitle" ile ayrıca eşitlenir ya da bölmeler kendi aralarında serbestçe ayarlanır. Grubun toplam genişliği de ayrıca girilebilir. Kapak ve çekmece önleri kutu başına "dışarıda (bindirme)" ya da "içeride (gömme)" seçilir; kutuya ayak yüksekliği verilebilir. "Dikmeler ve tablalar" bölümündeki üstten görünüş şeridinde istediğiniz dikmeye tıklayıp onu kapağın arkasına alırsınız (iki kutunun birleştiği dış dikmeler için kullanışlıdır): kapak o dikmenin önünü de örter ve dikmenin kalınlığı kapak ölçüsüne eklenir. Ara dikmede ikinci tıklama örten kapağı sağdaki bölmeye geçirir, üçüncüsü işareti kaldırır. Gömme kapakta işaretli dikme kapak kalınlığı + 2 mm geride kesilir; kapak açılınca göründüğü için ön kenarı bantlanır. Aynı seçim Dolaplar sekmesinde "Gövde yapısı" altında da vardır. Her kutunun rafları ve kapakları sağ panelden doğrudan ayarlanır; "Hızlı doldur" ile kapaklı, çekmeceli, askılı gibi hazır düzen verilir.
   - **2 · Dolaplar**: kutuları tek tek ayrıntılı ayarlayın.
5. **Dolaplar** (her işte son adım): Önizlemede sağ ve üst kenardaki tutamaçlarla dolabı sürükleyerek boyutlandırın; bölmeli dolapta ara dikme, ara tabla ve rafları burada da sürükleyin, kenarlarda ölçüler canlı yazar. Hem burada hem serbest çizimde fare tekerleği yakınlaştırır, orta tuş ya da Boşluk + sürükle kaydırır, köşedeki düğmelerle ekrana sığdırılır. Her dolabı ayrı düzenleyin: tip, ölçü, gövde yapısı (üst ve alt tabla ayrı ayrı "dikmelerin arasında" ya da "dikmelerin üstünde/altında"; tam en tablanın yan kenarları bantlanır, dikme o kadar kısalır), kapak (tam, yarım bindirme ya da gömme), raf, çekmece ve ray tipi. Parçanın üzerine gelince ölçüsünün hangi formülle bulunduğu görünür. Evye dolabında hazır bir evye modeli seçilir ya da eldeki evyenin ölçüleri girilir; yönü (damlalık solda/sağda), tezgâh kesim yeri ve batarya deliği hesaplanır, "Tezgâh (üstten)" çiziminde ölçüleriyle görünür. Damlalık duvara ya da boy dolaba taşıyorsa program uyarır; duvarda su girişi tanımlıysa dolap ona hizalanabilir. Liste yalnızca açık işin dolaplarını duvar ve çizim başlıkları altında gösterir. Arkalık kanallı ya da çakma seçilir: kanallı arkalık üst/alt tabla ve dikmelerdeki kanala girer; çakma arkalık dikmelerin arka kenarına çakılır, dolabın dış ölçüsünden her kenarda 2 mm eksik kesilir (bazalı dolapta baza bölgesini de örter), böylece arkayı tam kapatır ama yandan görünmez.
6. **Kesim ve Teklif**: "Kapsam" ile tüm işler ya da tek iş seçilir. Levha türüne göre kesim listesi, plaka yerleşim çizimleri, hırdavat, kenar bandı metrajı ve maliyet hesaplanır.
   - **Atölye PDF**: Kesim listesi, tezgâh işlemleri (evye kesimi, batarya deliği), plaka planları, hırdavat, bant ve maliyet dökümü.
   - **Teklif PDF**: Müşteriye verilecek dolap listesi ve KDV dahil toplam fiyat.
   - **Excel**: Bütün tablolar ayrı sayfalarda.
   - **DXF**: Plaka kesim planı (CNC ya da ebatlama için).
Her adımda yapılan değişiklik **geri alınabilir**: üst çubuktaki oklar, Ctrl+Z (geri al), Ctrl+Y ya da Ctrl+Shift+Z (yinele) ve Düzen menüsü. Yazarken ya da sürüklerken art arda yapılan değişiklikler tek adım sayılır; yazı alanının içindeyken Ctrl+Z yalnızca o alandaki metni geri alır. Başka proje açılınca geçmiş sıfırlanır.
7. **Ayarlar**: Atölye adı ve iletişim bilgileri (PDF başlığında görünür), plaka ölçüsü, testere payı, bant kalınlıkları, levha, bant ve hırdavat fiyatları, işçilik, kâr oranı ve KDV.

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
