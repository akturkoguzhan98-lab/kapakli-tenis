import Link from "next/link";
import { Badge, Empty } from "./ui";
import type { ScheduleItem } from "@/lib/queries";
import { RES_STATUS_LABEL } from "@/lib/labels";

export function ScheduleList({ items, date, showAttendance }: { items: ScheduleItem[]; date: string; showAttendance?: boolean }) {
  if (!items.length) return <Empty>Bu gün için ders veya rezervasyon yok.</Empty>;
  return (
    <ul className="divide-y divide-white/10">
      {items.map((i) => (
        <li key={i.key} className="flex flex-wrap items-center gap-3 py-2.5">
          <div className="w-[5.5rem] shrink-0 font-mono text-xs text-white/90 sm:w-24 sm:text-sm">{i.start}–{i.end}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{i.title}</div>
            <div className="text-xs text-white/65">
              {[i.court, i.coach, i.memberCount !== undefined ? `${i.memberCount} öğrenci` : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          {i.kind === "GROUP" ? <Badge tone="green">Grup</Badge> : (
            <Badge tone={i.reservation?.status === "BEKLEMEDE" ? "amber" : i.reservation?.type === "OZEL_DERS" ? "clay" : "blue"}>
              {i.reservation?.status === "BEKLEMEDE" ? RES_STATUS_LABEL.BEKLEMEDE : i.reservation?.type === "OZEL_DERS" ? "Özel ders" : "Kiralama"}
            </Badge>
          )}
          {showAttendance && i.groupId && (
            <Link href={`/yoklama/${i.groupId}?tarih=${date}`} className={i.lessonTaken ? "btn-secondary btn-sm" : "btn-primary btn-sm"}>
              {i.lessonTaken ? "Yoklama ✓" : "Yoklama al"}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
