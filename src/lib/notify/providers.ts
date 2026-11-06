import "server-only";
import { intlTr } from "../phone";

export type SendResult = { ok: boolean; test?: boolean; providerId?: string; error?: string };

/**
 * Otomatik WhatsApp gönderimi için Meta WhatsApp Business Cloud API kullanılır (isteğe bağlı, mesaj başı ücretli).
 * Ayarlanmamışsa sistem "elle gönderim" modunda çalışır: her mesaj için hazır metinle WhatsApp açılır,
 * siz sadece "Gönder"e basarsınız (ücretsiz).
 */
export function whatsappApiStatus(): string | null {
  const ok = process.env.WHATSAPP_PROVIDER === "cloud" && !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
  return ok ? `WhatsApp Cloud API (şablon: ${process.env.WHATSAPP_TEMPLATE || "kta_bilgilendirme"})` : null;
}

export async function sendMessage(phone: string, body: string): Promise<SendResult> {
  if (!whatsappApiStatus()) return { ok: true, test: true };
  try {
    return await sendWhatsApp(phone, body);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// İşletme tarafından başlatılan mesajlar onaylı şablon gerektirir.
// Şablon gövdesi tek değişkenli olmalı, ör: "Kapaklı Tenis Akademi bilgilendirme: {{1}}"
async function sendWhatsApp(phone: string, body: string): Promise<SendResult> {
  const to = intlTr(phone);
  if (!to) return { ok: false, error: "Geçersiz telefon numarası" };
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "kta_bilgilendirme",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "tr" },
        components: [{ type: "body", parameters: [{ type: "text", text: body }] }],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
  if (res.ok && data.messages?.[0]?.id) return { ok: true, providerId: data.messages[0].id };
  return { ok: false, error: `WhatsApp hatası: ${data.error?.message ?? res.status}` };
}
