import type { LegalTexts } from './types';

const tr: LegalTexts = {
  privacy: {
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme: 14 Ekim 2026',
    sections: [
      {
        h: '1. Kısaca',
        p: 'OptimaPDF araçları tarayıcınızda çalışır: üzerinde çalıştığınız dosyalar sunucumuza ya da başka bir yere gönderilmez. Sunucuya yalnızca iki özelliğin ihtiyaç duyduğu şey ulaşır — yapay zekâ özellikleri için metin ve URL\'den PDF\'e için bir sayfa adresi. Ziyaret istatistikleri (Google Analytics) yalnızca izninizle toplanır. Kullanıcı hesabı yoktur.',
      },
      {
        h: '2. Veri sorumlusu',
        p: 'Kişisel verilerin sorumlusu Leszek Hofman, Dąbrówka Nowa, Polonya\'dır. İletişim: kontakt@optimapdf.com. Veri Koruma Görevlisi atanmamıştır — verilerinizle ilgili her konuda yukarıdaki adrese yazın.',
      },
      {
        h: '3. Hangi verileri işliyoruz',
        sub: [
          {
            h: '3.1 Dosyalarınız',
            p: 'Tüm dosya araçları — birleştirme, bölme, sıkıştırma, OCR, düzenleme, imzalama, karartma, parola ile koruma ve tüm dosya dönüştürmeleri (PDF ↔ Word, Excel, PowerPoint, OpenOffice, görseller, HTML, EPUB, TXT, SVG) dahil — tamamen tarayıcınızda çalışır (JavaScript ve WebAssembly). Dosya sunucumuza gönderilmez. Sunucudan yalnızca uygulama dosyaları, yazı tipleri ve OCR dil verileri indirilir.',
          },
          {
            h: '3.2 Yapay zekâ özellikleri (YZ Sohbet, YZ Özet, YZ Çevirmen)',
            p: 'Bir yapay zekâ özelliğini kullandığınızda dosyadan çıkarılan metin (sohbette ayrıca sorunuz) sunucumuz üzerinden OpenRouter, Inc.\'e (ABD) gönderilir; o da metni dil modelinin sağlayıcısına iletir (şu anda OpenAI veya Microsoft Azure tarafından sunulan OpenAI GPT-4o mini). Araç, herhangi bir şey gönderilmeden önce bunu size bildirir.',
            items: [
              'Her istek, OpenRouter\'a göre verileri istekten sonra saklamayan ve onlarla model eğitmeyen bir sağlayıcı gerektirir. Böyle bir sağlayıcı yoksa istek başarısız olur — başka birine gönderilmez.',
              'İsteği, sitenin ortak API anahtarıyla sunucumuz gönderir: OpenRouter IP adresinizi veya tarayıcı bilgilerinizi almaz ve kendi anahtarınıza ihtiyacınız yoktur.',
              'Gönderilen metni ve yanıtı saklamayız.',
              'Sınır, IP adresi başına günde 15 istektir. Sayaç (IP adresiniz ve istek sayısı) ilk istekten itibaren 24 saat boyunca bir Upstash veritabanında tutulur ve ardından otomatik olarak silinir.',
            ],
          },
          {
            h: '3.3 URL\'den PDF\'e',
            p: 'Girdiğiniz sayfa adresi sunucumuza ulaşır; sunucu o sayfayı indirip PDF\'e dönüştürür. Ne adresi, ne sayfayı, ne de PDF\'i saklarız. Sınır, IP adresi başına 10 dakikada 30 dönüştürmedir — sayaç bir Upstash veritabanında 10 dakika tutulur.',
          },
          {
            h: '3.4 Teknik veriler',
            p: 'Barındırma sağlayıcımız (Vercel Inc.), istekleri yanıtlarken siteyi çalıştırmak ve korumak için teknik verileri işler — IP adresi, sayfa adresi, zaman ve tarayıcı türü. Sunucumuz yalnızca reddedilen API isteklerini (örneğin aşılan bir sınır veya başka bir siteden gelen istek) kaydeder; IP adresi ilk üç bölümüne kısaltılır (ör. 203.0.113.0).',
          },
          {
            h: '3.5 Tarayıcınızda saklananlar',
            p: 'Bazı ayarlar cihazınızda saklanır. Bize veya üçüncü taraflara gönderilmez:',
            items: [
              'localStorage: tema (açık/koyu), seçilen dil, analizle ilgili tercihiniz, araç ayarları ve son kullanılan araçların listesi.',
              'Seçilen dili tutan «x-detected-locale» çerezi (12 aya kadar) — sitenin dilinizde açılması için. Dil sürümlerinin çalışması için gereklidir ve izin gerektirmez.',
              'Uygulama önbelleği (service worker): araçların daha hızlı ve çevrimdışı çalışması için site dosyaları ve indirilen OCR dil verileri.',
              'Google Drive\'a bağlandıktan sonra: sekmeyi kapattığınızda veya süresi dolduğunda silinen, sessionStorage\'daki bir erişim belirteci.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox ve OneDrive',
            p: 'Buluttan dosya açmayı veya buluta kaydetmeyi kendiniz seçerseniz dosya, tarayıcınızla seçtiğiniz sağlayıcı (Google, Dropbox, Microsoft) arasında doğrudan aktarılır — sunucumuz üzerinden geçmez. O sağlayıcının penceresinde oturum açarsınız ve bu işleme onun koşulları ile gizlilik politikası uygulanır. Google Drive bize yalnızca OptimaPDF ile açılan veya oluşturulan dosyalara erişim verir; Dropbox dosya kaydetmeye; OneDrive ve SharePoint ise Microsoft penceresinin istediği dosyalara.',
          },
        ],
      },
      {
        h: '4. Hukuki dayanak',
        items: [
          'GDPR md. 6/1(b) — istediğiniz hizmetin sunulması: yapay zekâ özellikleri ve URL\'den PDF\'e.',
          'GDPR md. 6/1(f) — veri sorumlusunun meşru menfaati: sitenin işleyişi ve güvenliği, istek sınırları, kötüye kullanımın önlenmesi, teknik kayıtlar.',
          'GDPR md. 6/1(a) — izniniz: Google Analytics\'teki ziyaret istatistikleri. İzninizi istediğiniz zaman geri çekebilirsiniz (bölüm 10).',
        ],
      },
      {
        h: '5. Alıcılar',
        p: 'Veriler adımıza şu taraflarca işlenir veya bunlara iletilir:',
        items: [
          'Vercel Inc. (ABD) — sitenin ve uygulama sunucusunun barındırılması.',
          'Upstash, Inc. (ABD) — istek sınırı sayaçlarının veritabanı (IP adresi ve istek sayısı).',
          'OpenRouter, Inc. (ABD) ve OpenRouter\'ın isteği ilettiği model sağlayıcısı — yalnızca yapay zekâ özelliklerini kullandığınızda.',
          'Google LLC (ABD) — Google Analytics, yalnızca izninizle.',
          'Kamu makamları — yalnızca yasanın gerektirdiği durumlarda.',
        ],
      },
      {
        h: '6. AEA dışına aktarım',
        p: 'Uygulama sunucusu ABD\'deki bir Vercel veri merkezinde çalışır ve bölüm 5\'teki tüm alıcıların merkezi ABD\'dedir. Bu nedenle bölüm 3.2–3.4\'te açıklanan veriler ve Google Analytics verileri ABD\'ye aktarılır. Vercel Inc. ve Google LLC, AB-ABD Veri Gizliliği Çerçevesi kapsamında sertifikalıdır (Komisyonun (AB) 2023/1795 sayılı Uygulama Kararı); Vercel ayrıca standart sözleşme maddelerini uygular. Upstash ve OpenRouter için aktarım, onların veri işleme koşullarına göre yapılır. Dosyalarınız hiçbir yere aktarılmaz (bölüm 3.1).',
      },
      {
        h: '7. Verileri ne kadar süre saklıyoruz',
        items: [
          'Dosyalarınız: bize hiç ulaşmaz. Tarayıcıda, sayfayı kapattığınızda veya yenilediğinizde kaybolur.',
          'Yapay zekâya gönderilen metin ve dönüştürülecek sayfa adresleri: saklamayız.',
          'Yapay zekâ sınırı sayacı (IP adresi): ilk istekten itibaren 24 saat. URL\'den PDF\'e sayacı: 10 dakika.',
          'Barındırma sağlayıcısındaki sunucu kayıtları: mevcut Vercel planında 1 saat.',
          'Google Analytics verileri: Google Analytics\'teki saklama ayarına göre, en fazla 14 ay.',
          'Tarayıcınızdaki ayarlar: siz silene kadar; dil çerezi 12 aya kadar.',
        ],
      },
      {
        h: '8. Haklarınız',
        p: 'Erişim (GDPR md. 15), düzeltme (md. 16), silme (md. 17), işlemenin kısıtlanması (md. 18), veri taşınabilirliği (md. 20), itiraz (md. 21) ve izni istediğiniz zaman, önceki işlemenin hukuka uygunluğunu etkilemeden geri çekme hakkınız vardır. Bir denetim makamına da şikâyette bulunabilirsiniz — Polonya\'da Kişisel Verileri Koruma Ofisi Başkanı (ul. Stawki 2, 00-193 Varşova). Hesap olmadığı için teknik veriler genellikle belirli bir kişiyle ilişkilendirilemez (GDPR md. 11) — bize yazın, neler yapabileceğimize bakalım.',
      },
      {
        h: '9. Güvenlik',
        items: [
          'HSTS ile şifreli HTTPS bağlantısı.',
          'Sitenin başka sitelere gömülmesini engelleyen ve kamera, mikrofon ile konuma erişimi engelleyen bir Content Security Policy ve başlıklar.',
          'API isteklerinde köken denetimi (CSRF koruması), istek sınırları ve istek boyutu sınırı (100 MB).',
          'URL\'den PDF\'e, iç ağların veya sunucunun bulut hizmetlerinin adreslerini indirmez (SSRF koruması).',
          'Ayrıntılar: «Güvenlik» sayfası.',
        ],
      },
      {
        h: '10. Google Analytics ve izin',
        p: 'İzninizle, ziyaretleri saymak ve hangi araçların kullanıldığını görmek için Google Analytics 4 (Google LLC) kullanırız. Google bu durumda tarayıcınıza bir tanımlayıcı içeren çerezler (_ga, _ga_*) kaydeder ve ziyaretle ilgili verileri alır: görüntülenen sayfalar, yaklaşık konum, cihaz ve tarayıcı türü ve nereden geldiğiniz.',
        items: [
          'İzin olmadan Google Analytics betiği hiç yüklenmez — site Google ile iletişim kurmaz.',
          'İzninizi her sayfanın altındaki «Çerez ayarları» düğmesiyle istediğiniz zaman değiştirebilir veya geri çekebilirsiniz. Geri çekmek Google Analytics\'i hemen kapatır ve çerezlerini siler.',
          'Google Analytics\'i reklam veya profilleme için kullanmayız. Üzerinde çalıştığınız dosyalar asla Google\'a ulaşmaz.',
        ],
      },
      {
        h: '11. Değişiklikler',
        p: 'Sitenin işleyişi değiştiğinde bu politikayı değiştirebiliriz; son değişikliğin tarihi sayfanın üst kısmındadır. Sorular: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'GDPR Bilgilendirmesi',
    updated: 'Son güncelleme: 14 Ekim 2026',
    sections: [
      {
        h: '1. Veri sorumlusu',
        p: 'Kişisel verilerin sorumlusu Leszek Hofman, Dąbrówka Nowa, Polonya\'dır (optimapdf.com). Verilerinizle ilgili her konuda iletişim: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hangi verileri neden işliyoruz',
        items: [
          'Dosyalarınız — bunları bir sunucuda işlemeyiz. Tüm dosya araçları tarayıcınızda çalışır ve dosya cihazınızdan çıkmaz.',
          'Yapay zekâ özelliklerine gönderilen metin — isteğinizi yerine getirmek için (özet, çeviri, yanıt) sunucumuz üzerinden OpenRouter\'a ve model sağlayıcısına iletiriz. Saklamayız.',
          'URL\'den PDF\'e için sayfa adresi — sunucumuz o sayfayı indirip PDF oluşturur. Saklamayız.',
          'IP adresi — istek sınırlarını saymak (yapay zekâ: 24 saat, URL\'den PDF\'e: 10 dakika) ve kötüye kullanımı önlemek için; sunucu kaydında yalnızca reddedilen bir istekte ve kısaltılmış olarak.',
          'Google Analytics\'teki ziyaret verileri — yalnızca izninizle.',
          'Ayarlar (tema, dil, analiz tercihi) — yalnızca tarayıcınızda saklanır.',
        ],
      },
      {
        h: '3. Hukuki dayanaklar',
        items: [
          'GDPR md. 6/1(b) — istediğiniz hizmetin sunulması (yapay zekâ özellikleri, URL\'den PDF\'e).',
          'GDPR md. 6/1(f) — meşru menfaat: güvenlik ve istek sınırları.',
          'GDPR md. 6/1(a) — Google Analytics için izin.',
        ],
      },
      {
        h: '4. Saklama süreleri',
        items: [
          'Dosyalar, yapay zekâya gönderilen metin ve dönüştürülecek sayfa adresleri: saklanmaz.',
          'IP adresli istek sınırı sayaçları: 24 saat (yapay zekâ) ve 10 dakika (URL\'den PDF\'e).',
          'Barındırma sağlayıcısındaki sunucu kayıtları: 1 saat (mevcut Vercel planı).',
          'Google Analytics: en fazla 14 ay.',
          'Tarayıcınızdaki ayarlar: siz silene kadar; dil çerezi 12 aya kadar.',
        ],
      },
      {
        h: '5. Alıcılar',
        p: 'Verileri satmayız ve pazarlama amacıyla paylaşmayız. Adımıza verileri işleyenler: Vercel Inc. (barındırma), Upstash, Inc. (istek sınırı sayaçları), OpenRouter, Inc. ve model sağlayıcısı (yalnızca yapay zekâ özellikleri) ve izninizle Google LLC (Google Analytics). Hepsinin merkezi ABD\'dedir.',
      },
      {
        h: '6. Üçüncü ülkelere aktarım',
        p: 'Uygulama sunucusu ABD\'de çalışır; bu nedenle bölüm 2\'deki veriler (dosyalar ve tarayıcı ayarları hariç) ABD\'ye aktarılır. Vercel ve Google, AB-ABD Veri Gizliliği Çerçevesi kapsamında sertifikalıdır (Komisyonun (AB) 2023/1795 sayılı Kararı); Upstash ve OpenRouter verileri kendi veri işleme koşullarına göre işler.',
      },
      {
        h: '7. Haklarınız',
        items: [
          'Erişim (md. 15) ve düzeltme (md. 16).',
          'Silme (md. 17) ve işlemenin kısıtlanması (md. 18).',
          'Veri taşınabilirliği (md. 20) ve itiraz (md. 21).',
          'İzni istediğiniz zaman geri çekme — Google Analytics için sayfanın altındaki «Çerez ayarları» düğmesiyle.',
        ],
      },
      {
        h: '8. Haklarınızı nasıl kullanırsınız',
        p: 'kontakt@optimapdf.com adresine yazın. 30 gün içinde, ücretsiz yanıt veririz (açıkça dayanaksız veya aşırı talepler hariç — GDPR md. 12/5). Hesap olmadığı için teknik veriler genellikle belirli bir kişiyle ilişkilendirilemez (GDPR md. 11).',
      },
      {
        h: '9. Şikâyet',
        p: 'Verilerinizi GDPR\'a aykırı işlediğimizi düşünüyorsanız bir denetim makamına şikâyette bulunabilirsiniz — Polonya\'da Kişisel Verileri Koruma Ofisi Başkanı, ul. Stawki 2, 00-193 Varşova.',
      },
      {
        h: '10. Çerezler ve tarayıcı depolaması',
        p: 'Bir zorunlu çerez (x-detected-locale — sitenin dili, 12 aya kadar) ve ayarlar için localStorage kullanırız. Google Analytics çerezleri (_ga, _ga_*) yalnızca izninizden sonra oluşur ve izni geri çektiğinizde silinir. Reklam çerezi kullanmayız.',
      },
      {
        h: '11. Değişiklikler',
        p: 'Sitenin işleyişi değiştiğinde bu bilgilendirmeyi güncelleriz; son değişikliğin tarihi sayfanın üst kısmındadır.',
      },
    ],
  },

  security: {
    title: 'Güvenlik',
    updated: 'Son güncelleme: 14 Ekim 2026',
    intro: 'OptimaPDF\'in en önemli güvencesi yapmadığımız bir şeydir: dosyalarınızı bir sunucuya göndermeyiz. Aşağıda bunun nasıl çalıştığını ve diğer önlemleri — yalnızca gerçekten uyguladıklarımızı — anlatıyoruz.',
    sections: [
      {
        h: '1. Dosyalar cihazınızda kalır',
        p: 'Sıkıştırma, OCR ve dönüştürmeler dahil tüm dosya araçları tarayıcınızda çalışır (JavaScript ve WebAssembly). Dosya bir sunucuya gönderilmez; bu yüzden bizim tarafımızda kimse ona erişemez. Bunu kendiniz kontrol edebilirsiniz: tarayıcının geliştirici araçlarını (F12) açın, «Ağ» sekmesine gidin ve bir dosya işleyin — dosyanın yüklendiğini görmezsiniz. Sunucuya yalnızca yapay zekâ özellikleri için metin ve URL\'den PDF\'e için sayfa adresi ulaşır.',
      },
      {
        h: '2. Şifreli bağlantı',
        p: 'Site yalnızca HTTPS üzerinden çalışır. HSTS başlığı (tarayıcıların ön yükleme listesine kayıtlı) tarayıcının ilk ziyarette bile her zaman güvenli bağlanmasını sağlar.',
      },
      {
        h: '3. Tarayıcıda koruma',
        items: [
          'Content Security Policy, sitenin betikleri nereden yükleyebileceğini ve nelere bağlanabileceğini sınırlar: alan adımız ve orada adı geçen hizmetler (Google ile giriş, Dropbox, Microsoft ve izinden sonra Google Analytics).',
          'Site başka sitelere gömülemez (X-Frame-Options: DENY, frame-ancestors) — bu, tıklama korsanlığına karşı korur.',
          'Permissions-Policy kamera, mikrofon, konum, USB ve ödemelere erişimi engeller.',
          'X-Content-Type-Options ve Referrer-Policy dosya türü tahminini ve sayfa adreslerinin aktarılmasını sınırlar.',
        ],
      },
      {
        h: '4. Sunucu koruması',
        items: [
          'API istekleri yalnızca kendi sitemizden kabul edilir (Origin ve Referer başlıklarının denetimi — CSRF koruması).',
          'İstek sınırları: API için IP adresi başına dakikada 30, yapay zekâ özellikleri için günde 15, URL\'den PDF\'e için 10 dakikada 30; istek boyutu sınırı 100 MB.',
          'URL\'den PDF\'e özel ve yerel ağların ve sunucunun bulut hizmetlerinin adreslerini reddeder; denetlenen adres, sunucunun bağlandığı adresle aynıdır (SSRF ve DNS yeniden bağlamaya karşı koruma).',
          'API girdileri sunucuda denetlenir (metin uzunluğu, izin verilen çeviri dilleri).',
        ],
      },
      {
        h: '5. Yapay zekâ özellikleri',
        p: 'Yapay zekâya yalnızca dosyadan çıkarılan metni ve sorunuzu göndeririz — IP adresiniz veya tarayıcı bilgileriniz olmadan, sunucumuz ve onun API anahtarı üzerinden (kendi anahtarınıza gerek yoktur). Her istek, OpenRouter\'a göre verileri istekten sonra saklamayan ve onlarla model eğitmeyen bir sağlayıcı gerektirir; yoksa istek gerçekleştirilmez.',
      },
      {
        h: '6. Hesap veya profil yok',
        p: 'Kayıt veya giriş istemeyiz, parola saklamayız ve kullanıcı profili oluşturmayız. PDF\'leri korumak ve kilidini açmak için kullanılan parolalar ile imza sertifikaları yalnızca tarayıcınızda kullanılır.',
      },
      {
        h: '7. Bağımlılıklar',
        p: 'Kütüphaneleri güncel tutarız ve bilinen güvenlik açıklarını npm audit ile ve sitenin kullandığı bağımlılıklardaki her yeni yüksek veya kritik düzeydeki uyarıyı bildiren bir testle denetleriz.',
      },
      {
        h: '8. Güvenlik açığı bildirimi',
        p: 'Bir güvenlik açığı bulursanız kontakt@optimapdf.com adresine yazın. Şunları taahhüt ediyoruz:',
        items: [
          'alındığını 24 saat içinde onaylamak,',
          'incelemek ve 14 gün içinde (önem derecesine göre) bir düzeltme yayımlamak,',
          'ne yaptığımızı size bildirmek,',
          'açıkları iyi niyetle bildirenlere karşı yasal işlem başlatmamak.',
        ],
      },
      {
        h: '9. Sertifikalar',
        p: 'OptimaPDF\'in kendine ait ISO 27001 veya SOC 2 sertifikası yoktur. Barındırma sağlayıcımız Vercel ISO 27001:2022 sertifikalıdır ve SOC 2 Tip 2 raporuna sahiptir. Dosyalar sunucumuza hiç ulaşmadığından, bizim tarafımızda şifrelenecek «beklemedeki» dosya yoktur.',
      },
      {
        h: '10. Dijital imza ve eIDAS',
        p: '«PDF imzala» aracı kendi sertifikanızla (.p12/.pfx) bir PAdES dijital imzası oluşturur — tamamen tarayıcıda; ne dosya ne de sertifika gönderilir. Bu gerçek bir kriptografik imzadır ancak eIDAS Tüzüğü (AB 910/2014) anlamında otomatik olarak nitelikli elektronik imza (QES) değildir: QES statüsü, sertifikanın nitelikli bir güven hizmeti sağlayıcısı tarafından verilmiş olmasına ve anahtarın nitelikli bir cihazda bulunmasına bağlıdır.',
      },
    ],
  },

  principles: {
    security: 'Şifreli HTTPS bağlantısı, Content Security Policy, API\'yi kötüye kullanıma karşı koruma ve istek sınırları kullanırız. En önemlisi, dosya araçları tarayıcınızda çalışır; yani dosyalarınız sunucumuza hiç ulaşmaz.',
    tracking: 'Site şu anda reklam göstermiyor. Gelecekte barındırma ve geliştirme maliyetlerini karşılamak için ölçülü reklamlar (ör. Google AdSense) ekleyebiliriz — bu olursa bu bilgiyi güncelleyeceğiz. Her durumda tüm PDF araçları ücretsiz ve sınırsız kalacak. Google Analytics\'i yalnızca izninizle kullanırız; izninizi istediğiniz zaman «Çerez ayarları» düğmesiyle geri çekebilirsiniz. Yeniden pazarlama pikselleri veya davranışsal profilleme kullanmayız.',
  },
};

export default tr;
