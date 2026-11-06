"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEvaluate } from "@/lib/access";
import { ActionState, optStr, str } from "@/lib/forms";
import { isValidDate, todayStr } from "@/lib/dates";
import { SKILLS } from "@/lib/skills";

export async function createEvaluation(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("ADMIN", "COACH");
  const studentId = str(fd, "studentId");
  if (!(await canEvaluate(user, studentId))) return { error: "Bu öğrenci için karne yazma yetkiniz yok." };
  const term = str(fd, "term");
  if (!term) return { error: "Dönem adı girin (ör. 2026 Güz)." };
  const date = isValidDate(str(fd, "date")) ? str(fd, "date") : todayStr();

  const scores: Record<string, number> = {};
  for (const [k, label] of SKILLS) {
    const n = Number(str(fd, `skill_${k}`));
    if (!(n >= 1 && n <= 5)) return { error: `"${label}" için puan seçin.` };
    scores[k] = n;
  }
  const e = await db.evaluation.create({
    data: {
      studentId, date, term,
      scores: JSON.stringify(scores),
      strengths: optStr(fd, "strengths"),
      improve: optStr(fd, "improve"),
      goals: optStr(fd, "goals"),
      coachId: user.role === "COACH" ? user.id : optStr(fd, "coachId"),
    },
  });
  revalidatePath(`/karne/${studentId}`);
  revalidatePath("/karne");
  redirect(`/karne/${studentId}?id=${e.id}&yeni=1`);
}

export async function deleteEvaluation(fd: FormData) {
  const user = await requireUser("ADMIN", "COACH");
  const e = await db.evaluation.findUnique({ where: { id: str(fd, "id") } });
  if (!e) return;
  if (user.role === "COACH" && e.coachId !== user.id) return;
  await db.evaluation.delete({ where: { id: e.id } });
  revalidatePath(`/karne/${e.studentId}`);
  redirect(`/karne/${e.studentId}`);
}
