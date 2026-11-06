// Örnek veri (sadece yerel geliştirme): npm run db:seed
// Uyarı: YEREL veritabanındaki TÜM kayıtları silip baştan oluşturur. Canlı siteye dokunmaz.
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getPlatformProxy } from "wrangler";
import { hashPassword } from "../src/lib/password";
import { addDays, addMonths, currentPeriod, dayOfWeek, minutesBetween, todayStr } from "../src/lib/dates";

let db: PrismaClient;

async function main() {
  await db.notification.deleteMany();
  await db.evaluation.deleteMany();
  await db.setting.deleteMany();
  await db.attendance.deleteMany();
  await db.lesson.deleteMany();
  await db.groupMember.deleteMany();
  await db.payment.deleteMany();
  await db.reservation.deleteMany();
  await db.group.deleteMany();
  await db.student.deleteMany();
  await db.court.deleteMany();
  await db.user.deleteMany();

  const hash = await hashPassword("tenis123");
  const user = (name: string, email: string, role: string, phone?: string, extra: Record<string, unknown> = {}) =>
    db.user.create({ data: { name, email, role, phone, passwordHash: hash, ...extra } });

  await user("Akademi Yöneticisi", "yonetici@kapaklitenis.com", "ADMIN", "0532 000 00 00");
  const coachA = await user("Emre Yıldız", "emre@kapaklitenis.com", "COACH", "0533 111 11 11", { hourlyRate: 750 });
  const coachB = await user("Selin Kaya", "selin@kapaklitenis.com", "COACH", "0533 222 22 22", { hourlyRate: 650 });

  const parents = await Promise.all(
    [
      ["Ayşe Demir", "ayse@ornek.com", "0535 100 10 01", true],
      ["Mehmet Çelik", "mehmet@ornek.com", "0535 100 10 02", true],
      ["Zeynep Arslan", "zeynep@ornek.com", "0535 100 10 03", true],
      ["Murat Öztürk", "murat@ornek.com", "0535 100 10 04", true],
      ["Elif Şahin", "elif@ornek.com", "0535 100 10 05", false],
      ["Burak Aydın", "burak@ornek.com", "", true], // telefonu girilmemiş veli örneği
    ].map(([n, e, p, ok]) => user(n as string, e as string, "PARENT", (p as string) || undefined, { notifyConsent: ok })),
  );

  const courts = await Promise.all([
    db.court.create({ data: { name: "Kort 1", surface: "TOPRAK" } }),
    db.court.create({ data: { name: "Kort 2", surface: "TOPRAK" } }),
    db.court.create({ data: { name: "Kort 3", surface: "SERT", indoor: true } }),
  ]);

  const y = Number(todayStr().slice(0, 4));
  const st = (firstName: string, lastName: string, age: number, level: string, fee: number, parentIdx: number) =>
    db.student.create({
      data: { firstName, lastName, birthDate: `${y - age}-0${(age % 9) + 1}-15`, level, monthlyFee: fee, parentId: parents[parentIdx].id },
    });

  const s = await Promise.all([
    st("Deniz", "Demir", 7, "BASLANGIC", 2500, 0),
    st("Ece", "Demir", 10, "ORTA", 3000, 0),
    st("Kerem", "Çelik", 8, "BASLANGIC", 2500, 1),
    st("Ada", "Arslan", 6, "BASLANGIC", 2500, 2),
    st("Can", "Arslan", 12, "ILERI", 3500, 2),
    st("Defne", "Öztürk", 9, "ORTA", 3000, 3),
    st("Arda", "Öztürk", 14, "PERFORMANS", 4500, 3),
    st("Mira", "Şahin", 11, "ORTA", 3000, 4),
    st("Efe", "Aydın", 13, "ILERI", 3500, 5),
    st("Lina", "Aydın", 7, "BASLANGIC", 2500, 5),
  ]);

  const group = (name: string, level: string, dow: number, start: string, end: string, coachId: string, courtId: string, members: number[]) =>
    db.group.create({
      data: {
        name, level, dayOfWeek: dow, startTime: start, endTime: end, coachId, courtId, capacity: 6,
        members: { create: members.map((i) => ({ studentId: s[i].id })) },
      },
    });

  const groups = await Promise.all([
    group("Minikler Salı", "BASLANGIC", 2, "16:30", "17:30", coachB.id, courts[0].id, [0, 2, 3, 9]),
    group("Minikler Perşembe", "BASLANGIC", 4, "16:30", "17:30", coachB.id, courts[0].id, [0, 2, 3, 9]),
    group("Orta Grup Pazartesi", "ORTA", 1, "17:30", "19:00", coachA.id, courts[1].id, [1, 5, 7]),
    group("Orta Grup Çarşamba", "ORTA", 3, "17:30", "19:00", coachA.id, courts[1].id, [1, 5, 7]),
    group("İleri Grup Cuma", "ILERI", 5, "18:00", "19:30", coachA.id, courts[2].id, [4, 8]),
    group("Performans Cumartesi", "PERFORMANS", 6, "10:00", "12:00", coachA.id, courts[2].id, [4, 6, 8]),
    group("Hafta Sonu Minikler", "BASLANGIC", 7, "10:00", "11:00", coachB.id, courts[0].id, [3, 9]),
  ]);

  // Son 3 haftanın yoklamaları (en son dersin yoklaması bilerek boş bırakıldı → raporda uyarı görünsün)
  const today = todayStr();
  const statuses = ["GELDI", "GELDI", "GELDI", "GELDI", "GELMEDI", "IZINLI"];
  let k = 0;
  for (let back = 21; back >= 2; back--) {
    const date = addDays(today, -back);
    for (const g of groups) {
      if (g.dayOfWeek !== dayOfWeek(date)) continue;
      const members = await db.groupMember.findMany({ where: { groupId: g.id } });
      await db.lesson.create({
        data: {
          groupId: g.id, date, takenById: g.coachId, coachId: g.coachId, minutes: minutesBetween(g.startTime, g.endTime),
          note: ["Forehand tekniği", "Servis çalışması", "Ayak hareketleri", "Maç oyunu"][k % 4],
          attendances: { create: members.map((m) => ({ studentId: m.studentId, status: statuses[k++ % statuses.length] })) },
        },
      });
    }
  }

  // Son iki ay + bu ay aidatları
  const cur = currentPeriod();
  for (const [offset, payRatio] of [[-2, 1], [-1, 0.8], [0, 0.4]] as const) {
    const period = addMonths(cur, offset);
    for (let i = 0; i < s.length; i++) {
      const paid = i / s.length < payRatio;
      await db.payment.create({
        data: {
          studentId: s[i].id, period, amount: s[i].monthlyFee,
          // Bu ayın son ödeme tarihi 2 gün sonrası: "yaklaşan aidat" hatırlatması örneği görünsün
          dueDate: offset === 0 ? addDays(today, 2) : `${period}-10`,
          paidAmount: paid ? s[i].monthlyFee : 0,
          paidAt: paid ? `${period}-0${(i % 8) + 1}` : null,
          method: paid ? ["NAKIT", "KART", "HAVALE"][i % 3] : null,
        },
      });
    }
  }

  // Rezervasyonlar
  await db.reservation.createMany({
    data: [
      { date: addDays(today, 1), startTime: "09:00", endTime: "10:00", type: "OZEL_DERS", courtId: courts[1].id, userId: coachA.id, coachId: coachA.id, studentId: s[6].id },
      { date: addDays(today, 1), startTime: "20:00", endTime: "21:30", type: "KIRALAMA", courtId: courts[0].id, userId: parents[3].id, status: "ONAYLI", note: "Aile maçı" },
      { date: addDays(today, 2), startTime: "19:00", endTime: "20:00", type: "OZEL_DERS", courtId: courts[2].id, userId: parents[0].id, coachId: coachB.id, studentId: s[1].id, status: "BEKLEMEDE", note: "Servis üzerine çalışmak istiyoruz" },
      { date: addDays(today, 3), startTime: "08:00", endTime: "09:00", type: "KIRALAMA", courtId: courts[1].id, userId: parents[5].id, status: "BEKLEMEDE" },
    ],
  });

  // Geçmiş özel dersler (ders saati raporu için)
  await db.reservation.createMany({
    data: [
      { date: addDays(today, -3), startTime: "09:00", endTime: "10:00", type: "OZEL_DERS", courtId: courts[1].id, userId: coachA.id, coachId: coachA.id, studentId: s[6].id },
      { date: addDays(today, -5), startTime: "11:00", endTime: "12:30", type: "OZEL_DERS", courtId: courts[2].id, userId: coachA.id, coachId: coachA.id, studentId: s[4].id },
      { date: addDays(today, -4), startTime: "15:00", endTime: "16:00", type: "OZEL_DERS", courtId: courts[0].id, userId: coachB.id, coachId: coachB.id, studentId: s[1].id },
    ],
  });

  // Gelişim karneleri: bahar ve güz dönemi
  const sc = (base: number[]) => JSON.stringify(Object.fromEntries(
    ["forehand", "backhand", "servis", "vole", "ayak", "kondisyon", "taktik", "tutum"].map((k, i) => [k, Math.min(5, Math.max(1, base[i]))]),
  ));
  const evals: [number, string, number[], number[], string, string, string][] = [
    [1, coachA.id, [2, 2, 2, 1, 2, 3, 2, 4], [3, 3, 2, 2, 3, 3, 3, 4], "Forehand'de top kontrolü belirgin şekilde gelişti. Derslere düzenli ve istekli katılıyor.", "Servis atışında top atma tutarlılığı, backhand'de ağırlık aktarımı.", "Servisi düzenli içeri sokmak; kısa toplara hızlı çıkmak."],
    [4, coachA.id, [3, 3, 3, 2, 3, 3, 3, 4], [4, 3, 4, 3, 4, 4, 3, 5], "Servis hızı ve isabeti arttı, maç içinde çok kararlı.", "Fileye çıkış zamanlaması ve vole tekniği.", "Kulüp turnuvasında çeyrek final; fileye çıkış çalışması."],
    [6, coachA.id, [4, 3, 4, 3, 4, 4, 4, 4], [4, 4, 4, 4, 4, 5, 4, 5], "Kondisyonu ve maç disiplini çok iyi, backhand artık güvenilir bir vuruş.", "İkinci servis çeşitliliği (kick).", "Bölge turnuvası; kick servis."],
    [0, coachB.id, [1, 1, 1, 1, 2, 2, 1, 3], [2, 1, 2, 1, 2, 3, 2, 3], "Raketle topu karşılamada çok gelişti, derste çok mutlu.", "Dikkatini ders boyunca toplu tutmak.", "Forehand ile 5 top üst üste karşılıklı vuruş."],
  ];
  const y0 = Number(today.slice(0, 4));
  for (const [i, coachId, spring, fall, strengths, improve, goals] of evals) {
    await db.evaluation.create({ data: { studentId: s[i].id, coachId, date: `${y0}-06-15`, term: `${y0} Bahar`, scores: sc(spring), goals: "Temel vuruşları oturtmak." } });
    await db.evaluation.create({ data: { studentId: s[i].id, coachId, date: addDays(today, -2), term: `${y0} Güz`, scores: sc(fall), strengths, improve, goals } });
  }

  console.log("Örnek veriler yüklendi. Tüm hesapların şifresi: tenis123");
}

(async () => {
  const proxy = await getPlatformProxy<{ DB: ConstructorParameters<typeof PrismaD1>[0] }>();
  db = new PrismaClient({ adapter: new PrismaD1(proxy.env.DB) });
  try {
    await main();
  } finally {
    await db.$disconnect();
    await proxy.dispose();
  }
})();
