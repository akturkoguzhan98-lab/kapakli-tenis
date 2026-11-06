# Kapaklı Tenis Akademi — Yönetim Sistemi

Öğrenci/veli kaydı, grup dersleri ve yoklama, kort rezervasyonu ve aidat takibi için web uygulaması.
Telefondan ve bilgisayardan kullanılabilir.

## Roller

| Rol | Yapabildikleri |
|---|---|
| **Yönetici** | Her şey: öğrenci, veli, antrenör, grup, kort tanımları; aidat oluşturma ve tahsilat; rezervasyon onayı |
| **Antrenör** | Kendi günlük/haftalık programı, kendi gruplarında yoklama ve ders notu, özel ders için kort ayırma, kendi öğrencilerine karne, kendi ders saati raporu |
| **Veli** | Çocuklarının ders saatleri, yoklama geçmişi, aidat durumu ve gelişim karnesi; kort kiralama / özel ders **talebi** (yönetici onayına düşer) |

## Modüller

- **Öğrenciler** — seviye, doğum tarihi, aylık aidat, veli bağlantısı, notlar; öğrenci kartında devam oranı, aidat ve yoklama geçmişi
- **Gruplar** — haftanın günü/saat, antrenör, kort, kontenjan. Aynı saatte aynı kort veya antrenör iki gruba verilemez
- **Haftalık program** — grup dersleri, özel dersler ve kort kiralamaları tek takvimde
- **Yoklama** — Geldi / Gelmedi / İzinli + ders notu; geçmiş derslerde geriye dönük düzeltme
- **Kort rezervasyonu** — saatlik doluluk tablosu (08:00–23:00), grup dersleri ve diğer rezervasyonlarla çakışma kontrolü, antrenör müsaitlik kontrolü
- **Aidatlar** — tek tıkla aylık aidat oluşturma, kısmi/tam tahsilat (nakit, kart, havale), gecikenler listesi, dönem özeti
- **WhatsApp hatırlatmaları** — geciken ve son ödemesi yaklaşan aidatlar, ertesi günün dersleri, karne hazır bildirimi; tek tıkla ücretsiz elle gönderim veya isteğe bağlı otomatik gönderim, düzenlenebilir şablonlar, gönderim geçmişi
- **Ders saati raporu** — antrenör başına aylık grup + özel ders saati, saatlik ücretle hakediş, yoklaması alınmamış dersler, Excel'e (CSV) aktarma
- **Gelişim karnesi** — 8 beceride 1–5 puanlama (teknik, fiziksel, oyun/tutum), güçlü yönler / gelişim alanları / hedefler, önceki karneyle karşılaştırma, yazdırma/PDF; veliler kendi çocuklarının karnesini görür

## Canlıya alma — Cloudflare (ücretsiz)

Site Cloudflare Workers'ta, veritabanı Cloudflare D1'de çalışır. Bir akademinin kullanımı ücretsiz planın sınırları içinde kalır.
Kod GitHub'a her gönderildiğinde site kendiliğinden güncellenir.

> Cloudflare panelindeki menü adları zamanla değişebilir; aşağıdaki adımlar genel akışı anlatır.

**1. Veritabanını oluşturun**
Cloudflare paneli → **Storage & Databases → D1** → **Create database** → ad: `kapakli-tenis`.
Oluşan **Database ID**'yi kopyalayın ve `wrangler.jsonc` dosyasındaki `database_id` alanına yazın (GitHub'da dosyayı düzenleyip kaydedebilirsiniz).

**2. Siteyi GitHub'a bağlayın**
**Workers & Pages → Create → Import a repository** → GitHub hesabınızı bağlayıp bu depoyu seçin. Ayarlar:

| Alan | Değer |
|---|---|
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler d1 migrations apply DB --remote && npx opennextjs-cloudflare deploy` |

Deploy komutu her yayında veritabanı tablolarını da günceller.

**3. Gizli anahtarı ekleyin**
Oluşan Worker → **Settings → Variables and Secrets** → **Add** → tür *Secret*, ad `AUTH_SECRET`, değer: en az 32 karakterlik rastgele bir metin
(ör. bir şifre yöneticisiyle üretin). Bu, oturumları korur; kimseyle paylaşmayın.
Ardından **Deployments** sekmesinden yeniden yayınlayın.

**4. İlk giriş**
`https://kapakli-tenis.<hesabiniz>.workers.dev` adresini açın. Site boş olduğu için **ilk kurulum** sayfası açılır; yönetici hesabınızı oluşturun.
Sonra *Kullanıcılar* sayfasından antrenör ve veli hesaplarını, *Öğrenciler* ve *Gruplar* sayfalarından kayıtları girin.

**5. Kendi alan adınız (isteğe bağlı)**
Alan adınızı Cloudflare'e ekleyin (Websites → Add a site; alan adı firmanızda Cloudflare'in verdiği DNS sunucularını yazın).
Sonra Worker → **Settings → Domains & Routes → Add → Custom domain** → `kapaklitenis.com`.
`wrangler.jsonc` içindeki `APP_URL` değerini yeni adresle güncelleyin (karne bildirimindeki bağlantı için).

**Yedek:** D1'in *Time Travel* özelliğiyle veritabanı yakın bir tarihe geri alınabilir. Elle yedek almak için:
`npx wrangler d1 export kapakli-tenis --remote --output yedek.sql`

**Ücretsiz plan notları:** Ücretsiz planda Worker boyutu 3 MiB (sıkıştırılmış) ile sınırlı; bu uygulama yaklaşık 2 MiB.
İstek başına işlemci süresi de sınırlıdır; şifreler bu yüzden Cloudflare'in yerleşik PBKDF2 algoritmasıyla saklanır.
Sınırlara takılırsanız Workers Paid planı aylık 5 $'dır.

## Bilgisayarda geliştirme

Gereken: Node.js 20+

```bash
npm install
npm run setup     # yerel D1 veritabanını oluşturur ve örnek verileri yükler
npm run dev       # http://localhost:3000
npm run preview   # Cloudflare çalışma ortamında deneme: http://localhost:8787
```

Örnek hesaplar (sadece yerel, şifre hepsi için `tenis123`):
Yönetici `yonetici@kapaklitenis.com` · Antrenör `emre@kapaklitenis.com`, `selin@kapaklitenis.com` · Veli `ayse@ornek.com`, …

> `npm run db:seed` sadece **yerel** veritabanını silip örnek verilerle doldurur; canlı siteye dokunmaz.

Veritabanı şeması değişirse yeni tablo değişikliği dosyası üretin ve `migrations/` klasörüne ekleyin:

```bash
npx prisma migrate diff --from-local-d1 --to-schema-datamodel prisma/schema.prisma --script > migrations/0002_aciklama.sql
```

## WhatsApp hatırlatmaları

Hatırlatmalar sadece **WhatsApp** üzerinden gönderilir (SMS yok). İki çalışma şekli vardır:

**1. Elle gönderim — ücretsiz, kurulum gerektirmez (varsayılan)**
*WhatsApp hatırlatma* sayfasında geciken/yaklaşan aidatlar ve ertesi günün dersleri hazır mesajlarla listelenir.
“WhatsApp'ta gönder” düğmesine basınca WhatsApp (telefonda uygulama, bilgisayarda WhatsApp Web/masaüstü) mesaj yazılmış olarak açılır; siz **Gönder**'e basarsınız.
Sistem kime gönderildiğini kaydeder; listede “Gönderildi” olarak görünür, aynı veliye tekrar hatırlatılmaz. Bekleyen hatırlatmalar yönetici ana sayfasında da görünür.
Akademi için ayrı bir numarayla **WhatsApp Business** uygulaması kullanmanız önerilir.

**2. Otomatik gönderim — isteğe bağlı, Meta WhatsApp Business Cloud API (mesaj başına ücretli)**
1. business.facebook.com'da WhatsApp Business hesabı ve telefon numarası ekleyin.
2. Türkçe (`tr`), *Utility* kategorisinde, adı `kta_bilgilendirme` olan tek değişkenli bir şablon onaylatın:
   `Kapaklı Tenis Akademi bilgilendirme: {{1}}`
3. `.env` dosyasında `WHATSAPP_PROVIDER="cloud"`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` ve `CRON_SECRET` değerlerini doldurun.
4. *Şablonlar ve ayarlar* sekmesinden otomatik gönderimi açın ve günde bir kez şu adresi çağıran bir zamanlanmış görev kurun:

```bash
# crontab -e  → her gün 18:00
0 18 * * * curl -s -H "Authorization: Bearer GIZLI_ANAHTAR" https://alanadiniz.com/api/cron/hatirlatmalar
```

Hangi velinin mesaj alacağı (bildirim izni) **Kullanıcılar** sayfasından ayarlanır. İzni olmayan veliye mesaj hazırlanmaz.

## Teknik

Next.js 15 (App Router, Server Actions) · Cloudflare Workers (OpenNext) · Cloudflare D1 · Prisma (D1 adaptörü) · Tailwind CSS · JWT oturum (httpOnly çerez) · şifreler PBKDF2-SHA256.
Tüm yetki kontrolleri sunucu tarafında yapılır (`src/lib/auth.ts` → `requireUser`). Tarihler Türkiye saatine göre hesaplanır.

```
prisma/schema.prisma      veri modeli
prisma/seed.ts            örnek veriler (yerel)
migrations/               D1 veritabanı tabloları (SQL)
wrangler.jsonc            Cloudflare ayarları
src/app/actions/          sunucu aksiyonları (iş kuralları, doğrulama)
src/app/(app)/            sayfalar
src/lib/                  oturum, tarih, sorgu yardımcıları
```

## Sonraki adımlar için fikirler

- Online ödeme (iyzico / PayTR)
- Turnuva ve maç sonuçları takibi
- Deneme dersi / ön kayıt formu (web sitesinden)
