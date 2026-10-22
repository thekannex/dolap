# Dolap

Mobilya ve mutfak dolabı için ölçü çıkarma, kesim listesi, plaka kesim planı ve müşteri teklifi hazırlayan Windows masaüstü uygulaması.

Mutfak dolaplarının (alt, üst, boy, çekmeceli, evye) yanında gardırop, kitaplık, ayakkabılık, şifonyer, TV ünitesi gibi bağımsız mobilyalar ve serbest ölçülü dolaplar da hazırlanabilir. Kapaklar yana ya da yukarı (kalkar/katlanır) açılabilir.

## Kullanıcı için

### Çalıştırma (kurulum gerekmez)

Program tek bir dosyadır: `Dolap.exe` ([GitHub sürümler sayfasından](https://github.com/thekannex/dolap/releases/latest) indirilir). Kurulum yapılmaz; dosyayı istediğiniz bir klasöre (ya da USB belleğe) koyup çift tıklayın.

- **İlk açılışta** dosyanın yanında `Dolap-Dosyalari` klasörü oluşur ve program bir kez buraya hazırlanır (birkaç saniye, ilerleme çubuğuyla). **Sonraki açılışlar** hazırlık yapmadan doğrudan başlar.
- **Projeler de bu klasörde** (`Dolap-Dosyalari\veriler`) saklanır. Programı başka bir bilgisayara ya da USB belleğe taşırken `.exe` dosyasını ve `Dolap-Dosyalari` klasörünü **birlikte** taşıyın; projeleriniz de gelir.
- Daha önceki sürümlerde bu bilgisayarda kaydedilmiş projeler ilk açılışta yeni klasöre kopyalanır.
- **Güncelleme:** program her açılışta GitHub'da yeni sürüm olup olmadığına bakar. Varsa üstte şerit çıkar: **İndir ve güncelle** yeni dosyayı indirip doğrular, **Şimdi yeniden başlat** `Dolap.exe`'yi yerinde değiştirip yeni sürümü açar; projeler korunur. Hiçbir şey sorulmadan indirilmez. Elle denetlemek için **Yardım → Güncellemeleri denetle** ya da Ayarlar'daki **Güncellemeler** kartı. (1.17.0 ve öncesinde güncelleyici yoktu; o sürümlerden bir kez elle 1.18.0'a geçin: yeni `Dolap.exe`'yi eskisinin yanına koyup açın, eski .exe'yi silebilirsiniz.)
- Yeni sürüm ilk açılışta yeniden hazırlanır, eski sürümün program klasörü silinir; projeler kalır.
- Dosya yazılamayan bir yerdeyse (CD, salt okunur klasör) program geçici klasörde çalışır ve projeler kullanıcı klasörüne kaydedilir.
- Açılırken "Dolap açılıyor…" ekranı görünür.

Uygulama imzasız olduğu için Windows ilk açılışta "Windows bilgisayarınızı korudu" uyarısı gösterebilir. **Ek bilgi → Yine de çalıştır** ile açılır.

Bilgisayarda Node.js ya da başka bir program kurulu olması gerekmez; internet bağlantısı da gerekmez.

### İş akışı

Her sayfanın sol alt köşesindeki **?** düğmesi o sayfayı tanıtır: alanlar sırayla vurgulanır ve balonlarda ne işe yaradıkları anlatılır. İleri / Geri düğmeleri ya da ok tuşlarıyla ilerlenir, Esc ile kapatılır; istediğiniz zaman yeniden açabilirsiniz. Henüz bakılmamış sayfalarda düğmenin üstünde turuncu bir nokta yanıp söner.

1. **Projeler ve Proje**: Üst menüdeki **Projeler** sekmesi kayıtlı tüm projeleri listeler; açık proje kapanmadan buradan başka projeye geçilir (açık olan önce kaydedilir), yeni proje oluşturulur, yedekten açılır, çoğaltılır ya da silinir. **Proje** sekmesi açık projenin bilgilerini ve işlerini gösterir. Müşteri bilgilerini girin. Bir proje, aynı müşterinin birden çok **işini** taşır (örneğin mutfak + kiler + TV ünitesi); kesim listesi ve teklif hepsini birlikte ya da iş iş hesaplar. Proje sayfasından "Yeni iş ekle" ile üç türden biri seçilir. Üst menüde açık işin adı ve yalnızca o işe ait adımlar görünür; iş seçiciyle işler arasında geçilir.
2. **Duvar ölçüsü** (mutfak ve duvar dolabı işlerinin 1. adımı): Evlerde duvarlar her zaman dik ve düz değildir. Köşeden köşeye boyu, sol ve sağ yan duvarın şakul sapmasını ve köşe açısını (açıyı bilmiyorsanız "1 m ileride kaç mm içeri giriyor" ölçüsünden çevrilir), istediğiniz kadar noktada tavan yüksekliğini ve zemin farkını girin. Önden ve üstten çizimde farklar 10 kat büyütülerek görünür. Program dört sonuç verir: dolabın terazide sığdığı alan (mutfak önerisi ve duvar dolabı bunu kullanır), sol ve sağ kama dolgu ölçüleri (önde alt/üst, arkada), zemin farkına göre her noktadaki baza ve ayak yüksekliği, tavan kapamasının profili. Engeller (kolon, kiriş, pencere, priz…) burada ve sonraki adımlarda **istenildiği zaman sonradan da** eklenir. Dolaplar kurulduktan sonra ölçü ya da engel değişirse program uyarır: mutfakta çakışan dolapları listeler ve öneriyi yeniden uygulamayı önerir; duvar dolabında **Dolabı yeniden hesapla** ile dolap yeni duruma göre kurulur (ya da "Böyle kalsın").
3. **Mutfak işi**
   - **1 · Duvar ölçüsü**, **2 · Yerleşim**: Duvarın alttan, ortadan ve üstten genişliğini girin. Bulaşık makinesi, fırın gibi cihazları "Cihaz boşluğu" olarak ekleyin. **Öneriyi uygula** ile alt ve üst dolaplar otomatik yerleşir, kalan boşluğa dolgu konur.
   - **3 · Dolaplar**: dolapları tek tek ayarlayın (aşağıya bakın).
4. **Duvar dolabı işi** (kiler, gömme gardırop, boydan boya dolap)
   - **1 · Duvar ölçüsü**, **2 · Şekil ve alan**: Duvardaki kolon, kiriş, çıkıntı (şaft) ve girintiyi ekleyip 3B sahnede sürükleyerek yerleştirin; ölçü ve "derinlik" (duvardan ne kadar taştığı) yandan girilir. "Dolap alanı çiz" ile duvarın üstünde sürükleyerek ya da "Boydan boya" ile dolabın kaplayacağı alanı verin. Program alanı engellere göre kutulara böler: önler tek hizada kalır, çıkıntının önüne sığ dolap, yer kalmayan yere dolgu paneli gelir; kirişin altında dolap kısalır, önünde sığ üst kutu oluşur; pencere ve kapının önü boş kalır. Geniş bölümler "En geniş modül" ölçüsüne göre eşit kutulara ayrılır, "Üst kutu yüksekliği" verilirse üstte ayrı asma kutular çıkar. Sonuç canlı önizlenir; "Dolabı oluştur" ile serbest çizim kompozisyonu olarak kurulur ve oradan kutu kutu düzenlenir. Duvar şekli değişirse "dolabını yenile" ile yeniden üretilir.
   - **3 · Dolap düzeni**: Oluşan kutular duvarın şekli arka planda görünerek düzenlenir; her kutunun rafları, kapakları, çekmeceleri ve bölmeleri sağ panelden doğrudan ayarlanır.
   - **4 · Dolaplar**: kutuları tek tek ayrıntılı ayarlayın.
5. **Bağımsız ünite işi** (TV ünitesi, kitaplık, gardırop, şifonyer)
   - **1 · Çizim**: TV ünitesi, kitaplık duvarı, gardırop gibi birden çok kutudan oluşan mobilyaları önden görünüşte fareyle çizin ya da ölçüyle kurun. Her kutunun içeriği (kapaklı, çekmeceli, açık raf, yukarı açılır, askılı, boş niş) ve yerden yüksekliği seçilir; bitişik kutularda "ortak dikme / ortak tabla" seçilirse o panel kesim listesinden düşer. Hazır şablonlarla da başlanabilir. "Bölmelere ayır" ile bir kutu dikey bölmelere (ara dikme) ve yatay gözlere (ara tabla) ayrılır; her göze tek/çift kapak, yukarı açılır kapak, çekmece (adetli) ya da açık raf verilir, raflar sabit ya da hareketli olur. Ara dikme, ara tabla ve raflar çizimde sürüklenerek taşınır (10 mm adımlarla); seçili kutunun kenarlarında bölme genişlikleri ve göz yükseklikleri canlı yazar. "Bölmeleri eşitle" ve "Gözleri eşitle" tek tıkla eşit aralık verir. Bölme listesinde bir bölmeyi tutamacından sürükleyip başka bir bölmenin üstüne bırakınca ikisi bir grup olur; araya bırakınca sırası değişir, grubun dışına bırakınca gruptan çıkar. "Bölmeleri eşitle" her grubu tek bölme sayar (grubun içindeki oran korunur); grubun içi "Grubu eşitle" ile ayrıca eşitlenir ya da bölmeler kendi aralarında serbestçe ayarlanır. Grubun toplam genişliği de ayrıca girilebilir. Kapak ve çekmece önleri kutu başına "dışarıda (bindirme)" ya da "içeride (gömme)" seçilir; kutuya ayak yüksekliği verilebilir. "Dikmeler ve tablalar" bölümündeki üstten görünüş şeridinde istediğiniz dikmeye tıklayıp onu kapağın arkasına alırsınız (iki kutunun birleştiği dış dikmeler için kullanışlıdır): kapak o dikmenin önünü de örter ve dikmenin kalınlığı kapak ölçüsüne eklenir. Ara dikmede ikinci tıklama örten kapağı sağdaki bölmeye geçirir, üçüncüsü işareti kaldırır. Gömme kapakta işaretli dikme kapak kalınlığı + 2 mm geride kesilir; kapak açılınca göründüğü için ön kenarı bantlanır. Aynı seçim Dolaplar sekmesinde "Gövde yapısı" altında da vardır. Her kutunun rafları ve kapakları sağ panelden doğrudan ayarlanır; "Hızlı doldur" ile kapaklı, çekmeceli, askılı gibi hazır düzen verilir.
   - **2 · Dolaplar**: kutuları tek tek ayrıntılı ayarlayın.
6. **Dolaplar** (her işte son adım): Önizlemede sağ ve üst kenardaki tutamaçlarla dolabı sürükleyerek boyutlandırın; bölmeli dolapta ara dikme, ara tabla ve rafları burada da sürükleyin, kenarlarda ölçüler canlı yazar. Hem burada hem serbest çizimde fare tekerleği yakınlaştırır, orta tuş ya da Boşluk + sürükle kaydırır, köşedeki düğmelerle ekrana sığdırılır. Her dolabı ayrı düzenleyin: tip, ölçü, gövde yapısı (üst ve alt tabla ayrı ayrı "dikmelerin arasında" ya da "dikmelerin üstünde/altında"; tam en tablanın yan kenarları bantlanır, dikme o kadar kısalır), kapak (tam, yarım bindirme ya da gömme), raf, çekmece ve ray tipi. Parçanın üzerine gelince ölçüsünün hangi formülle bulunduğu görünür. Evye dolabında hazır bir evye modeli seçilir ya da eldeki evyenin ölçüleri girilir; yönü (damlalık solda/sağda), tezgâh kesim yeri ve batarya deliği hesaplanır, "Tezgâh (üstten)" çiziminde ölçüleriyle görünür. Damlalık duvara ya da boy dolaba taşıyorsa program uyarır; duvarda su girişi tanımlıysa dolap ona hizalanabilir. Liste yalnızca açık işin dolaplarını duvar ve çizim başlıkları altında gösterir. Arkalık kanallı ya da çakma seçilir (yeni dolaplar çakma, 3 mm ile başlar; kesim listesinde parça adı "Arkalık (çakma)" ya da "Arkalık (kanallı)" diye yazar): kanallı arkalık üst/alt tabla ve dikmelerdeki kanala girer; çakma arkalık dikmelerin arka kenarına çakılır, dolabın dış ölçüsünden her kenarda 2 mm eksik kesilir (bazalı dolapta baza bölgesini de örter), böylece arkayı tam kapatır ama yandan görünmez.
7. **Kesim ve Teklif**: "Kapsam" ile tüm işler ya da tek iş seçilir. Levha türüne göre kesim listesi, plaka yerleşim çizimleri, hırdavat, kenar bandı metrajı ve maliyet hesaplanır.
   - **Atölye PDF**: Kesim listesi, tezgâh işlemleri (evye kesimi, batarya deliği), plaka planları, hırdavat, bant ve maliyet dökümü.
   - **Teklif PDF**: Müşteriye verilecek dolap listesi ve KDV dahil toplam fiyat.
   - **Excel**: Bütün tablolar ayrı sayfalarda.
   - **DXF**: Plaka kesim planı (CNC ya da ebatlama için).
Her adımda yapılan değişiklik **geri alınabilir**: üst çubuktaki oklar, Ctrl+Z (geri al), Ctrl+Y ya da Ctrl+Shift+Z (yinele) ve Düzen menüsü. Yazarken ya da sürüklerken art arda yapılan değişiklikler tek adım sayılır; yazı alanının içindeyken Ctrl+Z yalnızca o alandaki metni geri alır. Başka proje açılınca geçmiş sıfırlanır.
8. **Ayarlar**: Atölye adı ve iletişim bilgileri (PDF başlığında görünür), plaka ölçüsü, testere payı, bant kalınlıkları, levha, bant ve hırdavat fiyatları, işçilik, kâr oranı ve KDV.

### Kayıt ve yedek

- Projeler her değişiklikte otomatik kaydedilir ve uygulama açılınca son proje açılır.
- Veriler programın yanındaki `Dolap-Dosyalari\veriler` klasöründe saklanır. Klasörü **Dosya → Verilerin bulunduğu klasörü aç** menüsünden açabilirsiniz.
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
npm run dist       # test + derleme + Windows taşınabilir exe (release/; scripts/build-portable.cjs + build/portable-launcher.nsi)
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
