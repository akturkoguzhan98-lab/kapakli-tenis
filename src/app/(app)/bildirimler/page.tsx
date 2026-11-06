import Link from "@/components/Link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, dateLabel, isValidDate, todayStr } from "@/lib/dates";
import { prettyPhone } from "@/lib/phone";
import { lessonReminders, overdueDues, upcomingDues } from "@/lib/notify/reminders";
import { getSettings, TEMPLATE_VARS } from "@/lib/notify/settings";
import { whatsappApiStatus } from "@/lib/notify/providers";
import { saveAutomation, saveTemplates } from "@/app/actions/notifications";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CandidateTable } from "@/components/CandidateTable";
import { Badge, Card, Empty, Field, PageHeader, TableWrap } from "@/components/ui";

const TABS = [
  ["aidat", "Aidat hatırlatma"],
  ["ders", "Ders hatırlatma"],
  ["gecmis", "Gönderim geçmişi"],
  ["ayarlar", "Şablonlar ve ayarlar"],
] as const;

const KIND_LABEL: Record<string, string> = { AIDAT: "Aidat", DERS: "Ders", KARNE: "Karne", GENEL: "Genel" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ sekme?: string; tarih?: string; gun?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.sekme) ? sp.sekme! : "aidat";
  const settings = await getSettings();
  const api = whatsappApiStatus();

  return (
    <>
      <PageHeader title="WhatsApp hatırlatmaları" subtitle="Velilere aidat ve ders hatırlatmaları" />
      {!api && (
        <div className="mb-4 rounded-lg border border-lime-300/30 bg-lime-300/15 px-4 py-3 text-sm text-lime-100">
          <b>Ücretsiz elle gönderim modu:</b> “WhatsApp'ta gönder” düğmesine basınca mesaj hazır yazılmış olarak açılır, siz <b>Gönder</b>'e basarsınız.
          Bilgisayarda WhatsApp Web veya masaüstü uygulaması, telefonda WhatsApp / WhatsApp Business ile çalışır.
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, v]) => (
          <Link key={k} href={`/bildirimler?sekme=${k}`} className={tab === k ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{v}</Link>
        ))}
      </div>
      {tab === "aidat" && <DuesTab days={Number(sp.gun) || Number(settings.auto_dues_days_before)} api={!!api} />}
      {tab === "ders" && <LessonsTab date={isValidDate(sp.tarih) ? sp.tarih : addDays(todayStr(), 1)} api={!!api} />}
      {tab === "gecmis" && <HistoryTab />}
      {tab === "ayarlar" && <SettingsTab settings={settings} api={api} />}
    </>
  );
}

async function DuesTab({ days, api }: { days: number; api: boolean }) {
  const [overdue, upcoming] = await Promise.all([overdueDues(), upcomingDues(undefined, days)]);
  return (
    <div className="space-y-6">
      <Card title={`Geciken aidatlar (${overdue.length})`} padded={false}>
        <CandidateTable items={overdue} source="gecikti" empty="Geciken aidat yok." apiEnabled={api} />
      </Card>
      <Card
        title={`Son ödemesi yaklaşanlar (${upcoming.length})`}
        padded={false}
        actions={
          <form className="flex items-center gap-1.5 text-xs">
            <input type="hidden" name="sekme" value="aidat" />
            Önümüzdeki
            <input name="gun" type="number" min={0} max={31} defaultValue={days} className="input w-16 py-1" />
            gün <button className="btn-secondary btn-sm">Göster</button>
          </form>
        }
      >
        <CandidateTable items={upcoming} source="yaklasan" params={{ gun: String(days) }} apiEnabled={api} empty={`Önümüzdeki ${days} gün içinde son ödemesi olan ödenmemiş aidat yok.`} />
      </Card>
    </div>
  );
}

async function LessonsTab({ date, api }: { date: string; api: boolean }) {
  const items = await lessonReminders(date);
  return (
    <Card
      title={`${dateLabel(date)} dersleri (${items.length} öğrenci)`}
      padded={false}
      actions={
        <form className="flex items-center gap-1.5">
          <input type="hidden" name="sekme" value="ders" />
          <input type="date" name="tarih" defaultValue={date} className="input w-auto py-1 text-xs" />
          <button className="btn-secondary btn-sm">Göster</button>
        </form>
      }
    >
      <CandidateTable items={items} source="ders" params={{ tarih: date }} apiEnabled={api} empty="Bu gün için ders yok." />
    </Card>
  );
}

async function HistoryTab() {
  const rows = await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { student: true, user: true } });
  return (
    <Card title="Son 150 mesaj" padded={false}>
      {rows.length === 0 ? <Empty>Henüz mesaj gönderilmedi.</Empty> : (
        <TableWrap>
          <table className="table">
            <thead><tr><th>Zaman</th><th>Alıcı</th><th>Tür</th><th className="min-w-[280px]">Mesaj</th><th>Durum</th></tr></thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td className="whitespace-nowrap text-xs">{n.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="text-xs">{n.user?.name ?? "—"}<div className="text-white/65">{prettyPhone(n.phone)}</div></td>
                  <td className="text-xs">{KIND_LABEL[n.kind]}</td>
                  <td className="text-xs text-white/75">{n.body}</td>
                  <td>
                    <Badge tone={n.status === "GONDERILDI" || n.status === "ELLE" ? "green" : n.status === "TEST" ? "amber" : "red"}>
                      {n.status === "GONDERILDI" ? "Otomatik gönderildi" : n.status === "ELLE" ? "Elle gönderildi" : n.status === "TEST" ? "Test" : "Hata"}
                    </Badge>
                    {n.error && <div className="mt-1 max-w-[220px] text-xs text-red-300">{n.error}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}

function SettingsTab({ settings, api }: { settings: Awaited<ReturnType<typeof getSettings>>; api: string | null }) {
  const tpl = [
    ["tpl_aidat", "Aidat hatırlatma (son ödeme yaklaşınca)"],
    ["tpl_gecikti", "Geciken aidat"],
    ["tpl_ders", "Ders hatırlatma"],
    ["tpl_karne", "Gelişim karnesi hazır"],
  ] as const;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Mesaj şablonları">
        <ActionForm action={saveTemplates} className="space-y-4">
          {tpl.map(([k, label]) => (
            <Field key={k} label={label}>
              <textarea name={k} rows={3} defaultValue={settings[k]} className="input" />
              <span className="mt-1 block text-xs text-white/65">Kullanılabilir alanlar: {TEMPLATE_VARS[k]}</span>
            </Field>
          ))}
          <SubmitButton>Şablonları kaydet</SubmitButton>
        </ActionForm>
      </Card>
      <div className="space-y-6">
        <Card title="Gönderim yöntemi">
          {api ? (
            <p className="text-sm"><Badge tone="green">Otomatik</Badge> <span className="ml-1">{api}</span></p>
          ) : (
            <div className="space-y-2 text-sm text-white/90">
              <p><Badge tone="green">Elle gönderim (ücretsiz)</Badge></p>
              <p className="text-xs text-white/65">
                Mesajlar akademinin WhatsApp'ından, düğmeye basılarak gönderilir. Tamamen otomatik gönderim isterseniz
                Meta WhatsApp Business Cloud API kurulabilir (mesaj başına küçük bir ücret alınır, kurulum README'de).
              </p>
            </div>
          )}
          <p className="mt-3 text-xs text-white/65">Velinin WhatsApp bildirim izni Kullanıcılar sayfasından ayarlanır; izni olmayan veliye mesaj hazırlanmaz.</p>
        </Card>
        <Card title="Otomatik gönderim (sadece API ile)">
          <ActionForm action={saveAutomation} className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="auto_enabled" defaultChecked={settings.auto_enabled === "1"} className="h-4 w-4" /> Otomatik hatırlatmalar açık
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="auto_lessons" defaultChecked={settings.auto_lessons === "1"} className="h-4 w-4" /> Ertesi günün ders hatırlatmalarını da gönder
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Son ödemeden kaç gün önce"><input name="auto_dues_days_before" type="number" min={0} max={15} defaultValue={settings.auto_dues_days_before} className="input" /></Field>
              <Field label="Geciken aidat tekrar (gün)"><input name="auto_overdue_repeat_days" type="number" min={1} max={30} defaultValue={settings.auto_overdue_repeat_days} className="input" /></Field>
            </div>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
          <p className="mt-4 text-xs text-white/65">
            {api ? "" : <><b>WhatsApp API ayarlı olmadığı için otomatik gönderim çalışmaz.</b> Gün ve tekrar ayarları elle gönderim listelerinde de kullanılır. </>}
            Otomatik gönderim için sunucuda günde bir kez şu adres çağrılır:
            <code className="mt-1 block break-all rounded bg-white/10 px-2 py-1">GET /api/cron/hatirlatmalar — Authorization: Bearer CRON_SECRET</code>
          </p>
        </Card>
      </div>
    </div>
  );
}
