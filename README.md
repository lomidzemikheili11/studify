# Studify — Tam Sayt (Frontend + Backend + Admin Panel)

Dünya çapında öğretmen bulma platformu. Türkçe ana dil, 8 ek dil desteği,
tam admin paneli ve öğretmen başvuru/onay sistemi ile birlikte gelir.

## Klasör Yapısı

```
studify/
├── backend/          ← Sunucu (Node.js/Express)
│   ├── server.js
│   ├── routes/        (auth, teachers, messages, admin, upload, complaints)
│   ├── data/db.json   (veritabanı dosyası, ilk çalıştırmada otomatik oluşur)
│   └── uploads/        (öğretmen fotoğrafları + kimlik/diploma belgeleri)
├── public/            ← Herkesin gördüğü site
│   └── locales/        (9 dilin çeviri dosyaları: tr, az, en, ru, ka, es, fr, zh, de)
└── admin-panel/        ← Yalnızca admin için, sitede hiçbir linki yoktur
```

## 1. Kurulum (bilgisayarınızda denemek için)

Node.js (v18+) gereklidir: https://nodejs.org

```bash
cd studify/backend
npm install
npm start
```

Terminalde şunu göreceksiniz:
```
Studify backend http://localhost:4000 ünvanında işləyir
Sayt:        http://localhost:4000/
Admin panel: http://localhost:4000/admin-panel/
```

- **Site:** http://localhost:4000/
- **Admin panel:** http://localhost:4000/admin-panel/login.html

### İlk Admin Girişi
- E-posta: `admin@studify.com`
- Şifre: `Admin123!`

**İlk giriş yaptığınızda 2FA (iki adımlı doğrulama) kurulumu zorunludur.**
Telefonunuza Google Authenticator veya Microsoft Authenticator gibi bir
uygulama indirin, ekrana gelen QR kodu okutun, uygulamadaki 6 haneli kodu
girin. Bundan sonra her girişte hem şifre hem bu kod istenecektir.

**ÖNEMLİ:** Canlıya almadan önce admin şifresini değiştirin (`backend/.env`
dosyasındaki `ADMIN_PASSWORD` değerini değiştirin, `backend/data/db.json`
dosyasını silin, sunucuyu yeniden başlatın — bu 2FA kaydını da sıfırlar,
yeniden kurmanız gerekir).

## 2. Neler Yapıldı (Faz 1)

### Marka ve Tasarım
- Studify adı, logosu, mavi-beyaz renk paleti sitenin tamamına uygulandı
- Site varsayılan olarak **Türkçe** açılır, kullanıcı üst menüden dil değiştirebilir
  (tercih tarayıcıda ve hesaba bağlıyken hesapta hatırlanır)

### 9 Dil Desteği
Türkçe (ana dil), Azerbaycan, İngilizce, Rusça, Gürcüce, İspanyolca,
Fransızca, Çince, Almanca. Her dilin çeviri dosyası `public/locales/`
klasöründedir — yeni metin eklemek istediğinizde bu 9 dosyayı güncellemeniz
yeterlidir.

### Arama Sistemi
Ülke (195 ülke listesi) + Şehir (serbest metin, tüm şehirler için) + Uyruk
+ Ders + Dil + Online/Yüz yüze filtreleri. Offline seçilince yalnızca o
şehirdeki öğretmenler gösterilir; online seçilince konum önemsizdir.

### Öğretmen Kayıt Sistemi
- Kayıt formu 2 adımdan oluşur: temel bilgiler → kimlik/diploma belge yükleme
- **Zorunlu alanlar:** Ad, soyad, e-posta, telefon, şifre, şehir, saatlik
  ücret, deneyim, ders şekli, öğretim dili, kendiniz hakkında metni, kimlik
  belgesi, kullanım şartları onayı
- **İsteğe bağlı alanlar:** yalnızca üniversite ve diploma/sertifika
- **Öğretmen, kayıt olur olmaz otomatik onaylanır ve sitede görünür** —
  admin onayı beklemez. Kimlik/diploma belgeleri yine de güvenlik için
  saklanır ve şifrelenir, yalnızca admin görebilir.
- Admin, istenmeyen bir öğretmeni sonradan **Öğretmenler** veya
  **Kullanıcılar** sayfasından bloklayabilir veya silebilir — bloklanan
  öğretmen anında (herkese açık arama ve profil sayfasından) kaldırılır.

### Admin Paneli (`/admin-panel/`, sitede hiçbir linki yok)
- **Dashboard:** canlı istatistikler (sahte sayı yok, sıfırdan başlar)
- **Öğretmenler:** başvuru detayı (15 soru cevabı + belgeler) görüntüleme,
  onaylama/reddetme, "Süper Öğretmen" işaretleme
- **Kullanıcılar:** bloklama/blok kaldırma, silme, **"Hesabına Gir"**
  (impersonation — kullanıcı adına giriş yapıp sorunlarını görme)
- **Mesajlar:** hem site formundan hem öğrenci/öğretmenden gelen mesajlar,
  cevap yazma. **Admin, "Mesaj Yaz" butonuyla (Öğretmenler ve Kullanıcılar
  sayfalarında) herhangi bir öğrenci veya öğretmene ilk mesajı kendisi de
  gönderebilir** — kullanıcının önce yazmış olması gerekmez.
- **Şikayetler:** öğrencilerin öğretmenler hakkındaki şikayetleri, ayrı
  bir sayfada (mesajlarla karışmaz)
- **Değerlendirmeler:** tüm yorumları görüntüleme/silme
- **İşlem Kayıtları:** admin'in "hesaba giriş" gibi hassas işlemlerinin
  kaydı (şeffaflık için)

### Güvenlik (Faz 4 — Maksimum Seviye)
- **Admin için zorunlu 2FA** — TOTP tabanlı (Google Authenticator, Microsoft
  Authenticator vb. ile uyumlu). İlk girişte kurulum zorunludur, QR kod +
  manuel yedek kod ile kurulur. Cihaz kaybında şifre ile devre dışı bırakılabilir.
- **Brute-force koruması** — giriş denemesi 15 dakikada 5 ile sınırlıdır
- **Güvenlik başlıkları** (Helmet.js) — clickjacking, MIME-sniffing koruması
  (not: Content-Security-Policy devre dışı, çünkü admin panel ve site inline
  script/style kullanıyor — bu, ileride daha da sıkılaştırılabilir)
- **Otomatik günlük yedekleme** — `backend/backups/` klasörüne, son 30 gün
  saklanır, sunucu her açıldığında ve her 24 saatte bir otomatik çalışır
- Sert şifre kuralları, şifreler bcrypt ile hashlenir
- Kimlik/diploma belgeleri ve özel mesajlar yalnızca admin tarafından görülebilir

### Görünüm (Faz 5)
- **Dark/Light tema** — sağ üst köşedeki 🌙/☀️ ikonuyla değiştirilir, tercih
  tarayıcıda hatırlanır, sayfa yenilendiğinde "yanlış temanın anlık
  görünmesi" (flash) önlenmiştir. Site genelinde (giriş, kayıt, mesajlaşma,
  panel sayfaları dahil) tam uyumludur.
- **Yaklaşık para birimi çevirisi** — dış bir servise/API anahtarına ihtiyaç
  duymadan, sitenin seçili diline göre (örn. Türkçe → ₺, İspanyolca → €)
  fiyatların yanında "≈" işaretiyle yaklaşık karşılığı gösterilir. Kurlar
  sabit bir tabloda tutulur (`public/js/currency-timezone.js`), gerçek
  zamanlı değildir — zaman zaman elle güncellenmesi gerekir.
- **Öğretmenin yerel saati** — profil sayfasında, öğretmenin ülkesine göre
  (155+ ülke için IANA saat dilimi eşlemesi) o an kaç olduğu gösterilir.

### Diğer düzeltmeler
- "Hakkımızda" metni daha kısa ve taranabilir hale getirildi (Sorun / Fikir
  / Sonuç yapısı, somut bir yıl referansı ile)
- Footer'daki ay-yıldız simgesi, Türk bayrağının kendisiyle (🇹🇷) değiştirildi
- Öğrenci ↔ Öğretmen arası site içi gerçek zamanlı mesajlaşma (`messages.html`)
- Öğretmen profilindeki "Mesaj Gönder" butonu artık gerçek sohbete yönlendirir
- Admin, `admin-panel/conversations.html` üzerinden TÜM yazışmaları görebilir
- Değerlendirme yazma artık gerçekten önceden iletişime geçmiş olmayı gerektiriyor

### Takvim / Rezervasyon Sistemi (Yeni)
- Öğretmen panelinde **"Takvimim"** sekmesi: müsait ders saatleri eklenir,
  ders programı görüntülenir
- Öğretmen profil sayfasında **"Uygun Ders Saatleri"** — öğrenci tek tıkla
  rezervasyon yapar
- Öğrenci panelinde **"Derslerim"** sekmesi: rezerve edilen dersler
  görüntülenir, iptal edilebilir

### Blog (Yeni)
- `blog.html` / `blog-post.html` — herkese açık makale listesi ve detay
  sayfası
- Admin panelinde **Blog** sayfası: makale oluşturma, düzenleme, silme,
  taslak/yayınlandı durumu

### Ek Güvenlik ve Uyumluluk (Yeni)
- **Mesaj şifrelemesi** — öğrenci↔öğretmen özel mesajları, veritabanı
  dosyasında AES-256-GCM ile şifreli saklanır; API üzerinden okunurken
  otomatik çözülür. Şifreleme anahtarı `backend/.env` dosyasındaki
  `ENCRYPTION_KEY` değişkenindedir.
- **"Hesabımı Sil"** — hem öğrenci hem öğretmen panelinde, şifre onayıyla
  kendi hesabını kalıcı olarak silebilir (KVKK/GDPR "silinme hakkı")
- **SEO** — her sayfada başlık/açıklama/Open Graph meta etiketleri,
  `robots.txt`, `sitemap.xml` (canlıya alırken içindeki `studify.com`
  yer tutucusunu gerçek domain adresinizle değiştirin)

## 3. E-posta ve Otomatik Çeviriyi Aktifleştirme

Bu ikisinin **kodu tamamen hazır** — sadece bir hesap açıp API bilgilerini
`backend/.env` dosyasına yapıştırmanız yeterli. Aşağıda en kolay yollar var.

### 3.1 E-posta Bildirimleri (Öğretmen onay/red e-postaları)

**En kolay yol: Gmail ile (muhtemelen zaten bir hesabınız var)**

1. Gmail hesabınızla https://myaccount.google.com/security adresine gidin
2. **"2 Adımlı Doğrulama"**yı açık değilse açın (zorunludur)
3. Aynı sayfada **"Uygulama Şifreleri"** (App Passwords) araması yapın,
   tıklayın
4. Uygulama adı olarak "Studify" yazın, **"Oluştur"**a basın
5. Çıkan 16 haneli şifreyi kopyalayın (boşluksuz, örn: `abcdwxyzabcdwxyz`)
6. `backend/.env` dosyasını açın, şu satırları doldurun:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=sizin-gmailiniz@gmail.com
   SMTP_PASS=az-once-kopyaladiginiz-16-haneli-sifre
   ```
7. Sunucuyu yeniden başlatın (`SAYTI-ACH.bat`)

Artık bir öğretmeni onayladığınızda/reddettiğinizde otomatik e-posta
gidecek. Gmail'in günlük gönderim sınırı 500'dür — küçük bir platform için
fazlasıyla yeterlidir.

**Alternatif (daha yüksek hacim için):** Resend.com veya SendGrid.com'da
ücretsiz hesap açıp onların verdiği SMTP bilgilerini aynı şekilde `.env`'e
girebilirsiniz.

### 3.2 Otomatik Mesaj Çevirisi

Bu, LibreTranslate adlı açık kaynak bir çeviri motoru kullanır. İki seçenek:

**Seçenek A — Ücretli hazır API (en kolay, dakikalar içinde):**
1. https://portal.libretranslate.com adresinden bir hesap açın
2. Bir API anahtarı alın (kullanım miktarına göre ücretlendirilir)
3. `backend/.env` dosyasına ekleyin:
   ```
   TRANSLATE_API_URL=https://libretranslate.com
   TRANSLATE_API_KEY=aldığınız-api-anahtarı
   ```

**Seçenek B — Kendi sunucunuzda ücretsiz çalıştırma (teknik bilgi gerekir):**
Bir sunucuya (örn. Render.com, DigitalOcean) Docker ile LibreTranslate
kurup tamamen ücretsiz, sınırsız kullanabilirsiniz. Bu adım teknik olduğu
için bir geliştiriciden yardım almanızı öneririz.

Her iki durumda da sunucuyu yeniden başlattığınızda mesajlaşma sayfasında
otomatik çeviri aktif olacak — karşı taraf, mesajı kendi dilinde görecek
ve "orijinalini gör" diyerek gerçek metne bakabilecek.

## 4. Diğer Notlar

- Profil dropdown menüsünün tam hali (bildirim sayacı vb.) henüz eklenmedi

## 5. Canlıya Alma (Domain Aldıktan Sonra)

1. Bu klasörü GitHub'a yükleyin
2. Render.com (veya benzeri) üzerinde:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment değişkenleri: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
3. Domain'inizi bağlayın

JWT_SECRET oluşturmak için:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
