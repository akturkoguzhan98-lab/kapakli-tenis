import { DAYS, DAY_LABEL, LEVELS, LEVEL_LABEL } from "@/lib/labels";
import { Field } from "./ui";

type G = { name?: string; level?: string; dayOfWeek?: number; startTime?: string; endTime?: string; capacity?: number; coachId?: string | null; courtId?: string | null; active?: boolean };

export function GroupFields({ g = {}, coaches, courts, showActive }: {
  g?: G; coaches: { id: string; name: string }[]; courts: { id: string; name: string }[]; showActive?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Grup adı *" className="sm:col-span-2"><input name="name" required defaultValue={g.name} placeholder="ör. Minikler Salı" className="input" /></Field>
      <Field label="Gün">
        <select name="dayOfWeek" defaultValue={g.dayOfWeek ?? 1} className="input">
          {DAYS.map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
        </select>
      </Field>
      <Field label="Seviye">
        <select name="level" defaultValue={g.level ?? "BASLANGIC"} className="input">
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
      </Field>
      <Field label="Başlangıç"><input name="startTime" type="time" required defaultValue={g.startTime ?? "17:00"} className="input" /></Field>
      <Field label="Bitiş"><input name="endTime" type="time" required defaultValue={g.endTime ?? "18:00"} className="input" /></Field>
      <Field label="Antrenör">
        <select name="coachId" defaultValue={g.coachId ?? ""} className="input">
          <option value="">— Seçilmedi —</option>
          {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Kort">
        <select name="courtId" defaultValue={g.courtId ?? ""} className="input">
          <option value="">— Seçilmedi —</option>
          {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Kontenjan"><input name="capacity" type="number" min={1} max={30} defaultValue={g.capacity ?? 6} className="input" /></Field>
      {showActive && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={g.active} className="h-4 w-4 rounded border-stone-300" /> Aktif grup
        </label>
      )}
    </div>
  );
}
