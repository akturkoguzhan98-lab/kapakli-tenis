import type { Candidate } from "@/lib/notify/reminders";
import { prettyPhone } from "@/lib/phone";
import { sendSelected } from "@/app/actions/notifications";
import { ActionForm, SubmitButton } from "./ActionForm";
import { Badge, Empty, TableWrap } from "./ui";
import { ToggleAll } from "./ToggleAll";
import { WaButton } from "./WaButton";

/**
 * Gönderime aday WhatsApp mesajları.
 * - Elle mod (ücretsiz): her satırdaki düğme WhatsApp'ı hazır mesajla açar.
 * - API modu: seçilenler tek tıkla otomatik gönderilir.
 */
export function CandidateTable({ items, source, params = {}, empty, apiEnabled }: {
  items: Candidate[]; source: string; params?: Record<string, string>; empty: string; apiEnabled: boolean;
}) {
  if (!items.length) return <Empty>{empty}</Empty>;
  const pending = items.filter((c) => !c.skipReason && !c.sentAt).length;
  const qs = (key: string) => new URLSearchParams({ kaynak: source, anahtar: key, ...params }).toString();

  const table = (
    <TableWrap>
      <table className="table">
        <thead>
          <tr>
            {apiEnabled && <th className="w-8"><ToggleAll /></th>}
            <th>Öğrenci / alıcı</th>
            <th>Konu</th>
            <th className="min-w-[280px]">Mesaj</th>
            <th>Durum</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.key} className={c.skipReason ? "opacity-60" : ""}>
              {apiEnabled && (
                <td>
                  <input type="checkbox" name="key" value={c.key} defaultChecked={!c.skipReason && !c.sentAt} disabled={!!c.skipReason} className="h-4 w-4" aria-label={`${c.studentName} seç`} />
                </td>
              )}
              <td>
                <div className="font-medium">{c.studentName}</div>
                <div className="text-xs text-white/65">{c.recipientName} · {prettyPhone(c.phone) || "telefon yok"}</div>
              </td>
              <td className="text-xs">{c.label}</td>
              <td className="text-xs text-white/75">{c.body}</td>
              <td className="whitespace-nowrap text-xs">
                {c.skipReason ? <Badge tone="red">{c.skipReason}</Badge>
                  : c.sentAt ? <Badge tone="green">Gönderildi {c.sentAt.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</Badge>
                  : <Badge>Gönderilmedi</Badge>}
              </td>
              <td>{!c.skipReason && c.waUrl && <WaButton href={`/wa-gonder?${qs(c.key)}`} sent={!!c.sentAt} primary={!apiEnabled} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );

  if (!apiEnabled) {
    return (
      <>
        {table}
        <p className="border-t border-white/10 p-3 text-xs text-white/65">
          {pending ? `${pending} mesaj bekliyor. ` : items.some((c) => c.sentAt) ? "Gönderilebilecek tüm mesajlar gönderildi. " : "Gönderilebilecek mesaj yok (telefon veya izin eksik). "}
          Düğmeye basınca WhatsApp mesaj yazılmış olarak açılır; siz sadece <b>Gönder</b>'e basın. Sistem kimin mesaj aldığını otomatik işaretler.
        </p>
      </>
    );
  }
  return (
    <ActionForm action={sendSelected}>
      <input type="hidden" name="source" value={source} />
      {Object.entries(params).map(([k, v]) => <input key={k} type="hidden" name={k === "gun" ? "days" : k === "tarih" ? "date" : k} value={v} />)}
      {table}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 p-3">
        <SubmitButton>Seçilenleri otomatik gönder</SubmitButton>
        <span className="text-xs text-white/65">{pending} mesaj bekliyor. Daha önce gönderilenler varsayılan olarak seçili değildir.</span>
      </div>
    </ActionForm>
  );
}
