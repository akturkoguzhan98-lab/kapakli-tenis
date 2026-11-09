# Kapaklı Tenis Akademi — Güncelleme ve test notları

Tarih: 9 Kasım 2026 · Sürüm: Google Apps Script (Index.html + Kod.gs)

## 1. Yeni özellikler

### Akademi adı ve logosu yönetici panelinden değiştirilebilir
- Yer: sağ üstteki yuvarlak profil düğmesi → **Akademi adı ve logosu**.
- Bu sayfayı yönetici ve antrenörler açabilir. Veli açmaya çalışırsa "yetkiniz yok" uyarısı görür.
- Yeni ad ve logo şu yerlerde kullanılır:
  - giriş ve ilk kurulum ekranı
  - üst menü
  - tarayıcı sekmesindeki başlık
  - gelişim karnesinin üst başlığı
  - WhatsApp mesajları
- Logo için PNG, JPG veya WEBP seçilebilir. Resim tarayıcıda otomatik küçültülür (en fazla 256 piksel), böylece E-Tablo hücresine sığar.
- "Varsayılan logoya dön" kutusuyla eski logoya dönülebilir.
- Mesaj şablonlarında akademi adı için `{akademi}` yazılabilir. Ad değiştirildiğinde, kayıtlı şablonlarda geçen eski ad otomatik olarak `{akademi}` ile değiştirilir; böylece mesajlarda hep güncel ad kullanılır.

### Öğrenci bilgileri kilidi
- Kaydı tamamlanmış bir öğrencinin sayfası açıldığında **Bilgiler** bölümü kilitli gelir. Alanlar soluk ve değiştirilemez; Kaydet düğmesi gizlidir.
- **🔒 Kilidi aç** düğmesine basınca "Öğrenci bilgilerini değiştirmek istiyor musunuz?" penceresi açılır:
  - **Evet, düzenle**: alanlar açılır.
  - **Vazgeç**, Esc tuşu ya da pencere dışına tıklama: kilit kapalı kalır.
- Düzenlerken **🔓 Vazgeç ve kilitle** düğmesi kaydedilmemiş değişiklikleri geri alır ve kilidi yeniden kapatır.
- **Kaydet**'e basılınca değişiklik saklanır ve bilgiler yeniden kilitlenir.
- Yeni öğrenci eklerken form kilitsizdir.

### Onay pencereleri yenilendi
Tarayıcının düz "Tamam/İptal" kutuları kaldırıldı. Silme, geri alma, gruptan çıkarma, talep reddetme gibi tüm onaylar artık sitenin cam temasına uygun **Evet / Vazgeç** penceresiyle soruluyor.

## 2. Nasıl test edildi
Testler, Google Apps Script ve E-Tablo'yu taklit eden yerel bir test ortamında, gerçek bir tarayıcıyla yapıldı.

| Test | Sonuç |
|---|---|
| Ana uçtan uca test paketi (giriş, kilit, tüm sayfalar, öğrenci, aidat, grup, yoklama, kort, WhatsApp, karne, rapor, kullanıcı, veli/antrenör yetkileri, telefon görünümü, yeni kilit ve logo testleri) | **91 / 91 geçti** |
| Ek akış testleri (ilk kurulum, boş sistemde tüm sayfalar, oturum hatırlama ve düşme, gruba öğrenci ekleme/çıkarma, kort ekleme/pasif yapma, tahsilatı geri alma, aidat kaydı silme, onay penceresinde vazgeçme, şablon kaydetme, raporu E-Tabloya yazma, karne silme, şifre değiştirme, veli kort talebi → yönetici onayı) | **33 / 33 geçti** |
| Tarama: 3 rol (yönetici, antrenör, veli) × 3 ekran (masaüstü, tablet, telefon) × tüm sayfalar | **156 sayfa görünümü**: JavaScript hatası yok, yana taşma yok, kırık görsel yok |

## 3. Bulunan ve düzeltilen hatalar
1. **Velinin ayar sayfasını görmesi:** Veli `#/ayarlar` adresini elle yazarsa akademi adı formunu görebiliyordu. Kaydetme sunucuda zaten engelliydi, ama artık sayfa hiç açılmıyor.
2. **Karne başlığı sabitti:** Karnenin üstünde her zaman "KAPAKLI TENİS AKADEMİ" yazıyordu. Artık ayarlardaki adı gösteriyor.
3. **Telefonda aidat oluşturma kutusu:** Açıklama metni çok dar bir sütuna sıkışıp kelime kelime alt alta diziliyordu. Düzeltildi.
4. **Telefonda onay kutuları:** "Kapalı kort", "Otomatik gönderim" gibi onay kutularının satırı yükseltildi, parmakla dokunmak kolaylaştı.
5. **Test düzeneği:** Önceki raporlarda "aidat tahsilatı" diye geçen tek başarısız test maddesinin nedeni test düzeneğinin kendisiydi; düzeltildi. Sistemde bir hata yoktu.

## 4. Bilinmesi gerekenler
- **Kilit bir kaza önlemidir, yetki değildir.** Yanlışlıkla değişikliği önler. Öğrenci bilgilerini değiştirme yetkisi yine yönetici ve antrenörlerdedir.
- **Hosting sayfası (`hosting/index.html`) ayrı bir dosyadır.** Kendi alan adınızdan açtığınız sayfanın sekme başlığı ve küçük simgesi o dosyanın içinde sabit yazılıdır. Akademi adını değiştirirseniz o dosyadaki `<title>` satırını da elle güncelleyin.
- **Otomatik WhatsApp (Meta API) kullanıyorsanız:** Meta'da onaylatılan şablonun sabit kısmı ("Kapaklı Tenis Akademi bilgilendirme: …") Meta tarafında kayıtlıdır ve sistemden değiştirilemez. Ücretsiz elle gönderimde bu sorun yoktur.
- **Antrenör yetkileri:** Antrenörler yönetici ile aynı yetkilere sahiptir. Buna kullanıcı hesabı açmak ve akademi adını/logosunu değiştirmek de dahildir.
- **Gerçek ortamda deneme:** Testler, Google Apps Script'i taklit eden bir ortamda yapıldı. Yükledikten sonra sırayla şunları deneyin:
  1. Giriş yapın.
  2. Profil düğmesinden **Akademi adı ve logosu** sayfasını açıp bir logo yükleyin.
  3. Bir öğrencinin sayfasında kilidi açıp kapatın.
- **Cloudflare sürümü:** Bu güncellemeler yalnızca Google Apps Script sürümüne yapıldı.

## 5. Yükleme
1. Apps Script'te **Kod.gs** dosyasını açın, Ctrl+A ile tamamını seçip silin, yeni Kod.gs'nin tamamını yapıştırın.
2. **Index** dosyası için de aynısını yapın.
3. **Ctrl+S** ile kaydedin.
4. **Dağıt → Dağıtımları yönet → ✏️ → Sürüm: Yeni sürüm → Dağıt.**
5. Sayfayı **Ctrl+F5** ile yenileyin.
