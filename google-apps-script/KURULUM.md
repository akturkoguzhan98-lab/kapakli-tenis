# Kapaklı Tenis Akademi — Google Apps Script kurulumu

Bu klasör, sistemin **Google Apps Script** sürümüdür. Tüm özellikler aynıdır:
giriş/ilk kurulum, yönetici–antrenör–veli rolleri, öğrenciler, gruplar, haftalık program, yoklama,
kort rezervasyonu, aidatlar, WhatsApp hatırlatmaları, gelişim karnesi ve ders saati raporu.

| Dosya | Ne işe yarar |
|---|---|
| `Kod.gs` | Sunucu kodu: giriş, yetkiler, tüm iş kuralları |
| `Index.html` | Tüm arayüz (tek dosya, logo içinde gömülü) |
| `appsscript.json` | Proje ayarları (saat dilimi, izinler, web uygulaması) |
| `hosting/index.html` | Kendi alan adınızdan açmak için hosting firmasına yüklenecek sayfa |

**Veritabanı:** Google E-Tablolar. Her tablo E-Tablo'da ayrı bir sayfadır (Users, Students, Payments …).
Sayfalar ilk çalıştırmada kendiliğinden oluşur. Verilerin yedeği için E-Tablo'nun
*Dosya → Sürüm geçmişi* özelliği kullanılabilir.

---

## 1. E-Tabloyu ve betiği oluşturun

1. **drive.google.com** → **Yeni → Google E-Tablolar**. Adını `Kapaklı Tenis Akademi Veritabanı` yapın.
2. E-Tablo açıkken üst menüden **Uzantılar → Apps Script**'e tıklayın. Yeni bir sekmede düzenleyici açılır.
3. Soldaki **Kod.gs** dosyasının içini tamamen silin, bu klasördeki **`Kod.gs`** dosyasının tamamını yapıştırın.
4. Soldaki **Dosyalar** yanındaki **+** → **HTML**'i seçin. Adını tam olarak **`Index`** yazın (sonuna `.html` eklenir).
   İçini silip bu klasördeki **`Index.html`** dosyasının tamamını yapıştırın.
5. Sol menüde **⚙ Proje Ayarları** → **"appsscript.json" manifest dosyasını düzenleyicide göster** kutusunu işaretleyin.
   Dosyalar listesinde çıkan **`appsscript.json`**'un içini, bu klasördeki `appsscript.json` ile değiştirin.
6. **💾 Kaydet** (Ctrl+S).

## 2. (İsteğe bağlı) Örnek verilerle deneyin

Düzenleyicinin üstündeki fonksiyon listesinden **`ornekVerileriYukle`** seçin ve **▶ Çalıştır**'a basın.
İlk çalıştırmada Google izin ister: **İzinleri incele → hesabınız → Gelişmiş → (güvenli değil) sayfasına git → İzin ver**.
(Bu uyarı, betiği sizin yazdığınız ve Google tarafından incelenmediği için çıkar.)

Örnek hesaplar (şifre hepsi için `tenis123`): yönetici `yonetici@kapaklitenis.com`,
antrenör `emre@kapaklitenis.com`, veli `ayse@ornek.com`.

> Gerçek kullanıma geçmeden önce **`tumVerileriSil`** fonksiyonunu çalıştırın. Sistem boş açılır ve
> sizden yönetici hesabı oluşturmanızı ister.

## 3. Web uygulaması olarak yayınlayın

1. Sağ üstte **Dağıt → Yeni dağıtım**.
2. **Türü seçin** (⚙) → **Web uygulaması**.
3. Ayarlar:
   - **Açıklama:** `Kapaklı Tenis Akademi`
   - **Şu kullanıcı olarak yürüt:** **Ben** (sizin hesabınız)
   - **Erişimi olanlar:** **Herkes** (velilerin Google hesabı olması gerekmez; sisteme kendi e-posta/şifreleriyle girerler)
4. **Dağıt** → izin isterse verin → çıkan **Web uygulaması URL'sini** (`https://script.google.com/macros/s/…/exec`) kopyalayın.
5. Bu adresi açın. Veri yoksa **ilk kurulum** sayfası gelir: yönetici hesabınızı oluşturun.

## 4. Kendi alan adınızdan açmak (hosting firması)

1. `hosting/index.html` dosyasını bir metin düzenleyiciyle açın.
2. `BURAYA_WEB_UYGULAMASI_ADRESI` yazısını 3. adımda kopyaladığınız adresle değiştirin.
3. Dosyayı hosting firmanızın paneline (genellikle **public_html** klasörüne) `index.html` adıyla yükleyin.
4. Artık `https://alanadiniz.com` adresi sistemi açar.

## 5. Kodu güncellerken

Kod değiştiğinde **Dağıt → Dağıtımları yönet → ✏️ (düzenle) → Sürüm: Yeni sürüm → Dağıt**.
Böylece **adres değişmez**. ("Yeni dağıtım" yaparsanız yeni bir adres oluşur; hosting sayfasını da güncellemeniz gerekir.)

## 6. WhatsApp hatırlatmaları

Varsayılan **ücretsiz elle gönderim**dir: *WhatsApp* sayfasında “WhatsApp'ta gönder”e basınca mesaj hazır yazılmış
olarak açılır, siz **Gönder**'e basarsınız; sistem kime gönderildiğini kaydeder.

**İsteğe bağlı otomatik gönderim (Meta WhatsApp Business Cloud API, mesaj başına ücretli):**
1. Meta'da Türkçe, *Utility* kategorisinde, adı `kta_bilgilendirme`, gövdesi `Kapaklı Tenis Akademi bilgilendirme: {{1}}` olan şablonu onaylatın.
2. Apps Script → **⚙ Proje Ayarları → Komut dosyası özellikleri** → şunları ekleyin:
   `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, (isteğe bağlı) `WHATSAPP_TEMPLATE`.
3. Sistemde *WhatsApp → Şablonlar ve ayarlar*'dan otomatik gönderimi açın.
4. Düzenleyicide **`zamanlanmisGoreviKur`** fonksiyonunu bir kez çalıştırın (her gün 18:00'de çalışır).

Karne bildirimindeki bağlantı varsayılan olarak web uygulaması adresidir. Kendi alan adınızı kullanmak için
**Komut dosyası özellikleri**'ne `APP_URL` = `https://alanadiniz.com` ekleyin.

## Bilinmesi gerekenler

- **Hız:** E-Tablo tabanlı olduğu için her sayfa yaklaşık 1–3 saniyede açılır.
- **Aynı anda kullanım:** Apps Script aynı anda en fazla ~30 işlem çalıştırır; bir akademi için yeterlidir.
- **E-Tabloyu elle düzenleme:** Mümkün ama dikkatli olun; `id` sütunlarını değiştirmeyin, satır silmeyin.
  Değişiklikleri sistemin içinden yapmak en güvenlisidir.
- **Oturum:** Giriş 7 gün hatırlanır. Bazı tarayıcılar (özellikle iPhone Safari) Google'ın web uygulamalarında
  bilgiyi saklamayı engelleyebilir; o durumda her ziyarette yeniden giriş istenebilir.
- **Güvenlik:** Şifreler özetlenerek saklanır; aynı e-postayla 15 dakikada 5 hatalı denemede giriş 15 dakika kilitlenir.
  Yönetici, Kullanıcılar sayfasında hesabı kaydederek kilidi hemen kaldırabilir.
- **Rapor dışa aktarma:** *Ders saati raporu* sayfasında **CSV** indirebilir ya da **E-Tabloya yaz** ile raporu
  veritabanı E-Tablosunda yeni bir sayfaya yazdırabilirsiniz (oradan Excel olarak indirilebilir).

## Geliştiriciler için

`Index.html`, `kaynak/Index.template.html` dosyasından üretilir (logo gömülür):

```bash
python3 kaynak/derle.py
```
