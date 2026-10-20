import type { PageId } from '../../../stores/ui-store';

export interface TourStep {
  /** Vurgulanacak öğenin data-tour değeri; yoksa balon ekranın ortasında çıkar. */
  target?: string;
  title: string;
  text: string;
}

/** Sayfa tanıtımları. Hedefi o an ekranda olmayan adımlar atlanır. */
export const TOURS: Partial<Record<PageId, TourStep[]>> = {
  projects: [
    { title: 'Projeler', text: 'Kayıtlı bütün projeleriniz burada. Projeler bu bilgisayarda kendiliğinden kaydedilir; ayrıca kaydetmeniz gerekmez.' },
    { target: 'projects-new', title: 'Yeni proje', text: 'Bir müşteri için yeni proje açar. İlk işin türünü seçersiniz: mutfak, duvar dolabı ya da bağımsız ünite. Aynı projeye sonradan başka işler de eklenir.' },
    { target: 'projects-import', title: 'Yedekten aç', text: '.dolap.json yedek dosyasını içe aktarır. Projeyi başka bilgisayara taşımak ya da eski bir yedeği açmak için kullanın.' },
    { target: 'projects-table', title: 'Proje listesi', text: 'Aç ile projeye geçilir; açık olan proje AÇIK etiketiyle görünür. Satırın sonunda çoğalt, yedek al ve sil düğmeleri var.' },
    { target: 'nav-projects', title: 'Projeler sekmesi', text: 'Hangi sayfada olursanız olun buradan proje listesine dönersiniz. Başka projeye geçerken açık proje önce kaydedilir.' },
  ],
  project: [
    { target: 'project-stats', title: 'Proje özeti', text: 'Projedeki bütün işlerin toplam dolap, parça ve plaka sayısı ile KDV dahil teklif tutarı.' },
    { target: 'project-info', title: 'Proje bilgileri', text: 'Müşteri adı, telefon, adres ve teklife yazılacak notlar. Bunlar teklif PDF\'inde görünür.' },
    { target: 'project-jobs', title: 'İşler', text: 'Projedeki her iş: mutfak, duvar dolabı ya da bağımsız ünite. Adına tıklayıp değiştirebilir, Aç ile o işin adımlarına geçebilirsiniz.' },
    { target: 'project-add-job', title: 'Yeni iş ekle', text: 'Aynı projeye başka bir iş ekler (örneğin mutfağın yanına kiler ya da TV ünitesi). Her türün kendi adımları vardır.' },
    { target: 'nav-job', title: 'İş seçici', text: 'Üst menüde açık iş görünür. Buradan işler arasında geçersiniz; menüdeki adımlar seçilen işe göre değişir.' },
    { target: 'nav-steps', title: 'İşin adımları', text: 'Açık işin adımları numaralıdır. Soldan sağa ilerleyin: önce duvar ya da çizim, en son dolapların ayrıntıları.' },
    { target: 'nav-project-pages', title: 'Kesim, teklif ve 3D', text: 'Bu sayfalar tüm projeyi kapsar; isterseniz tek bir işe de indirgenir.' },
    { target: 'undo', title: 'Geri al / yinele', text: 'Yaptığınız her değişiklik geri alınabilir. Kısayollar: Ctrl+Z geri al, Ctrl+Y yinele.' },
  ],
  'wall-layout': [
    { target: 'wall-picker', title: 'Duvar', text: 'Bu işin duvarları. L ya da U mutfakta her duvarı "Yeni duvar" ile ayrı ekleyin.' },
    { target: 'wall-measure', title: 'Saha ölçüleri', text: 'Genişliği alttan, ortadan ve üstten; yüksekliği soldan, ortadan ve sağdan ölçüp girin. En dar ölçüden montaj payı düşülür.' },
    { target: 'wall-plan', title: 'Otomatik yerleşim', text: 'Kullanmak istediğiniz dolap genişliklerini seçin; program duvarı en uygun şekilde böler. "Öneriyi uygula" alt ve üst dolapları kurar.' },
    { target: 'wall-obstacles', title: 'Engeller ve cihazlar', text: 'Pencere, kapı, priz, su girişi, bulaşık makinesi boşluğu gibi engelleri ölçüleriyle ekleyin. Cihaz boşlukları yerleşimde boş bırakılır.' },
    { target: 'wall-view', title: 'Önden görünüş', text: 'Duvar, engeller ve dolaplar ölçekli çizilir. Bir dolaba tıklayınca o dolabın ayrıntılı düzenlemesine geçilir.' },
    { target: 'nav-steps', title: 'Sonraki adım', text: 'Dolapları tek tek ayarlamak (kapak, raf, çekmece, evye) için 2. adım "Dolaplar"a geçin.' },
  ],
  'wall-shape': [
    { target: 'wall-measure', title: 'Saha ölçüleri', text: 'Dolabın oturacağı duvarın genişlik ve yüksekliğini girin. Tavan eğikse üç yükseklikten en düşüğü kullanılır.' },
    { target: 'shape-add', title: 'Duvar şekli', text: 'Kolon, kiriş, çıkıntı (şaft) ve girinti ekleyin. Sahnede sürükleyerek taşıyın ya da seçip ölçüsünü girin. "Derinlik", duvardan odaya ne kadar taştığıdır.' },
    { target: 'shape-canvas', title: '3D sahne', text: 'Boşlukta sürükleyerek döndürün, tekerlekle yakınlaşın, sağ tıkla kaydırın. Kolon ve kirişleri tutup duvar boyunca sürükleyebilirsiniz.' },
    { target: 'shape-toolbar', title: 'Dolap alanı çiz', text: 'Bu araçla duvarın üstünde sürükleyerek dolabın kaplayacağı alanı çizin. Seç / taşı ile engelleri taşımaya dönersiniz.' },
    { target: 'shape-region', title: 'Dolap alanı', text: 'Alanı ölçüyle de verebilirsiniz; "Boydan boya" tüm duvarı kaplar. "En geniş modül" kutuların enini, "Üst kutu yüksekliği" ayrı asma kutuları belirler.' },
    { target: 'shape-result', title: 'Sonuç', text: 'Alan engellere göre kutulara bölünür: çıkıntının önüne sığ dolap, yer kalmayan yere dolgu gelir. "Dolabı oluştur" ile kurulur; raf ve kapakları 2. adımda düzenleyin.' },
  ],
  composer: [
    { target: 'composer-list', title: 'Çizimler', text: 'Bu işin çizimleri. Bir işte birden çok çizim olabilir; + ile yenisi eklenir, adı aşağıdan değiştirilir.' },
    { target: 'composer-newbox', title: 'Yeni kutu', text: 'Çizeceğiniz kutunun içeriğini ve derinliğini seçin, sonra çizim alanında boş yerde sürükleyerek kutu çizin.' },
    { target: 'composer-canvas', title: 'Çizim alanı', text: 'Kutuyu sürükleyip taşıyın, kenarlarından boyutlandırın; ara dikme, ara tabla ve rafları da sürükleyin. Tekerlek yakınlaştırır; Delete siler, oklar 10 mm kaydırır.' },
    { target: 'composer-panel', title: 'Kutu ayarları', text: 'Seçili kutunun rafları, kapakları, çekmeceleri, bölmeleri, ölçüsü ve konumu burada. Kutu seçili değilken hazır şablonlar ve ölçüyle kutu ekleme çıkar.' },
    { target: 'nav-steps', title: 'Ayrıntılar', text: 'Kutuları en ince ayrıntısıyla (gövde, arkalık, bant) ayarlamak için "Dolaplar" adımına geçin.' },
  ],
  editor: [
    { target: 'editor-list', title: 'Dolap listesi', text: 'Açık işin dolapları, duvar ve çizim başlıkları altında. "Ekle" ile bu işe tek dolap eklenir.' },
    { target: 'editor-params', title: 'Dolap ayarları', text: 'Tip, ölçü, gövde yapısı (tabla birleşimi, kapak arkasındaki dikmeler, arkalık), kapak, raf, çekmece ve bölmeler.' },
    { target: 'editor-preview', title: 'Önizleme', text: 'Kenardaki tutamaçlarla dolabı sürükleyerek boyutlandırın. Bir parçanın üzerine gelince ölçüsünün hangi formülle bulunduğu görünür.' },
    { target: 'editor-parts', title: 'Parça listesi', text: 'Uyarılar, dolabın parçaları, kenar bantları ve hırdavatı. Üstteki düğmelerle dolabı çoğaltır ya da silersiniz.' },
  ],
  'cut-list': [
    { target: 'scope', title: 'Kapsam', text: 'Hesap tüm işler için ya da seçtiğiniz tek iş için yapılır. Tek iş seçilince çıktılar o işin adını taşır.' },
    { target: 'cut-exports', title: 'Çıktılar', text: 'Atölye PDF (kesim listesi, plaka planı, hırdavat), müşteriye teklif PDF\'i, tüm tablolar için Excel ve CNC / ebatlama için DXF.' },
    { target: 'cut-stats', title: 'Özet', text: 'Dolap, parça ve plaka sayısı, kenar bandı metrajı ve KDV dahil teklif.' },
    { target: 'cut-tabs', title: 'Ayrıntılar', text: 'Kesim listesi, plaka yerleşim çizimleri, hırdavat ve bant, maliyet ve teklif sekmeleri.' },
    { target: 'nav-settings', title: 'Fiyatlar', text: 'Levha, bant ve hırdavat birim fiyatlarını Ayarlar\'dan girin; maliyet ve teklif buna göre hesaplanır.' },
  ],
  '3d-preview': [
    { target: 'view-mode', title: 'Görünüm', text: 'Tek dolabı yakından ya da tüm seti (duvarlarıyla birlikte) görün.' },
    { target: 'scope', title: 'Kapsam', text: 'Tüm işler ya da yalnızca seçtiğiniz iş gösterilir.' },
    { target: 'view-canvas', title: '3D sahne', text: 'Sürükleyerek döndürün, tekerlekle yakınlaşın, sağ tıkla kaydırın. Tüm sette bir dolaba tıklayınca o dolap seçilir.' },
  ],
  settings: [
    { target: 'settings-workshop', title: 'Atölye bilgileri', text: 'Atölye adı ve iletişim bilgileri PDF çıktılarının başlığında görünür.' },
    { target: 'settings-sheet', title: 'Plaka ve kesim', text: 'Plaka ölçüsü ve testere payı; kesim planı ve plaka sayısı buna göre hesaplanır.' },
    { target: 'settings-prices', title: 'Fiyatlar', text: 'Levha, bant ve hırdavat fiyatlarını girin. Teklif bu fiyatlardan hesaplanır; girilmeyen fiyat sıfır sayılır.' },
    { target: 'settings-quote', title: 'Teklif', text: 'İşçilik, kâr oranı ve KDV. Teklif PDF\'indeki toplam bunlarla bulunur.' },
  ],
};
