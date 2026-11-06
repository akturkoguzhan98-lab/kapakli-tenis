export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Yönetici",
  COACH: "Antrenör",
  PARENT: "Veli",
};

export const LEVELS = ["BASLANGIC", "ORTA", "ILERI", "PERFORMANS"] as const;
export const LEVEL_LABEL: Record<string, string> = {
  BASLANGIC: "Başlangıç",
  ORTA: "Orta",
  ILERI: "İleri",
  PERFORMANS: "Performans",
};

export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const DAY_LABEL: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
};

export const SURFACE_LABEL: Record<string, string> = { TOPRAK: "Toprak", SERT: "Sert", CIM: "Çim" };

export const ATTENDANCE_LABEL: Record<string, string> = {
  GELDI: "Geldi",
  GELMEDI: "Gelmedi",
  IZINLI: "İzinli",
};

export const RES_TYPE_LABEL: Record<string, string> = { KIRALAMA: "Kort kiralama", OZEL_DERS: "Özel ders" };
export const RES_STATUS_LABEL: Record<string, string> = {
  ONAYLI: "Onaylı",
  BEKLEMEDE: "Onay bekliyor",
  IPTAL: "İptal",
};

export const PAY_METHOD_LABEL: Record<string, string> = { NAKIT: "Nakit", KART: "Kredi kartı", HAVALE: "Havale/EFT" };

// Kort çalışma saatleri
export const OPEN_FROM = "08:00";
export const OPEN_UNTIL = "23:00";
