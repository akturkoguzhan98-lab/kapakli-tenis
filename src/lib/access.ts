import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";

/** Kullanıcı bu öğrencinin karnesini görebilir mi? (yönetici; öğrencinin grubundaki antrenör; velisi) */
export async function canViewStudent(user: CurrentUser, studentId: string) {
  if (user.role === "ADMIN") return true;
  if (user.role === "PARENT") return !!(await db.student.findFirst({ where: { id: studentId, parentId: user.id } }));
  return !!(await db.groupMember.findFirst({ where: { studentId, group: { coachId: user.id } } }));
}

export async function canEvaluate(user: CurrentUser, studentId: string) {
  return user.role !== "PARENT" && (await canViewStudent(user, studentId));
}
