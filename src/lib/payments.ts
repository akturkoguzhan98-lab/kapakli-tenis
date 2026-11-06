import { todayStr } from "./dates";

export type PayStatus = "ODENDI" | "KISMI" | "BEKLIYOR" | "GECIKTI";

export function paymentStatus(p: { amount: number; paidAmount: number; dueDate: string }): PayStatus {
  if (p.paidAmount >= p.amount) return "ODENDI";
  if (p.dueDate < todayStr()) return "GECIKTI";
  if (p.paidAmount > 0) return "KISMI";
  return "BEKLIYOR";
}

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  ODENDI: "Ödendi",
  KISMI: "Kısmi ödendi",
  BEKLIYOR: "Bekliyor",
  GECIKTI: "Gecikti",
};
