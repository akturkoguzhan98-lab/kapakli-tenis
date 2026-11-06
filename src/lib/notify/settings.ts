import "server-only";
import { db } from "../db";

export const DEFAULT_SETTINGS = {
  tpl_aidat: "Sayın {veli}, {ogrenci} için {donem} aidatı {tutar}. Son ödeme tarihi: {sonOdeme}. Kapaklı Tenis Akademi",
  tpl_gecikti: "Sayın {veli}, {ogrenci} için {donem} aidatından {tutar} ödeme bekleniyor (son ödeme: {sonOdeme}). Ödediyseniz bu mesajı dikkate almayınız. Kapaklı Tenis Akademi",
  tpl_ders: "Sayın {veli}, {ogrenci} için ders hatırlatması: {tarih} saat {saat}, {kort}. ({ders}) Kapaklı Tenis Akademi",
  tpl_karne: "Sayın {veli}, {ogrenci} için {donem} gelişim karnesi hazırlandı. Veli panelinden inceleyebilirsiniz: {link}",
  auto_enabled: "0", // otomatik (zamanlanmış) gönderim açık mı
  auto_dues_days_before: "3", // son ödemeden kaç gün önce hatırlatılsın
  auto_overdue_repeat_days: "7", // geciken aidat kaç günde bir tekrar hatırlatılsın
  auto_lessons: "1", // ertesi günün ders hatırlatmaları otomatik gitsin mi
};

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type Settings = Record<SettingKey, string>;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export async function saveSettings(values: Partial<Settings>) {
  for (const [key, value] of Object.entries(values)) {
    await db.setting.upsert({ where: { key }, create: { key, value: value! }, update: { value: value! } });
  }
}

/** "{ogrenci}" gibi yer tutucuları doldurur */
export function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export const TEMPLATE_VARS: Record<string, string> = {
  tpl_aidat: "{veli} {ogrenci} {donem} {tutar} {sonOdeme}",
  tpl_gecikti: "{veli} {ogrenci} {donem} {tutar} {sonOdeme}",
  tpl_ders: "{veli} {ogrenci} {tarih} {saat} {kort} {ders} {antrenor}",
  tpl_karne: "{veli} {ogrenci} {donem} {link}",
};
