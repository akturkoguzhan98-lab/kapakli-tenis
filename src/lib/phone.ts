/** Türk cep telefonu numarasını "5XXXXXXXXX" biçimine çevirir; geçersizse null. */
export function normalizeTrMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0090")) d = d.slice(4);
  else if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? d : null;
}

/** WhatsApp için uluslararası biçim: 905XXXXXXXXX */
export function intlTr(raw: string | null | undefined): string | null {
  const n = normalizeTrMobile(raw);
  return n ? `90${n}` : null;
}

/** Elle gönderim için WhatsApp bağlantısı (API gerekmez, telefonda/bilgisayarda WhatsApp açılır) */
export function waLink(phone: string | null | undefined, text: string): string | null {
  const n = intlTr(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export function prettyPhone(raw: string | null | undefined): string {
  const n = normalizeTrMobile(raw);
  if (!n) return raw ?? "";
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
}
