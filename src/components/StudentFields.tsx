import { LEVELS, LEVEL_LABEL } from "@/lib/labels";
import { Field } from "./ui";

type S = {
  firstName?: string; lastName?: string; birthDate?: string | null; phone?: string | null;
  level?: string; monthlyFee?: number; notes?: string | null; parentId?: string | null; active?: boolean;
};

export function StudentFields({ s = {}, parents, showActive }: { s?: S; parents: { id: string; name: string; phone: string | null }[]; showActive?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ad *"><input name="firstName" required defaultValue={s.firstName} className="input" /></Field>
      <Field label="Soyad *"><input name="lastName" required defaultValue={s.lastName} className="input" /></Field>
      <Field label="Doğum tarihi"><input name="birthDate" type="date" defaultValue={s.birthDate ?? ""} className="input" /></Field>
      <Field label="Telefon (öğrenci)"><input name="phone" type="tel" defaultValue={s.phone ?? ""} className="input" /></Field>
      <Field label="Seviye">
        <select name="level" defaultValue={s.level ?? "BASLANGIC"} className="input">
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
      </Field>
      <Field label="Aylık aidat (TL)"><input name="monthlyFee" type="number" min={0} step={50} defaultValue={s.monthlyFee ?? 0} className="input" /></Field>
      <Field label="Veli" className="sm:col-span-2">
        <select name="parentId" defaultValue={s.parentId ?? ""} className="input">
          <option value="">— Veli seçilmedi —</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>)}
        </select>
        <span className="mt-1 block text-xs text-stone-500">Listede yoksa önce Kullanıcılar sayfasından veli hesabı oluşturun.</span>
      </Field>
      <Field label="Notlar (sağlık, hedefler vb.)" className="sm:col-span-2">
        <textarea name="notes" rows={3} defaultValue={s.notes ?? ""} className="input" />
      </Field>
      {showActive && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4 rounded border-stone-300" /> Aktif öğrenci
        </label>
      )}
    </div>
  );
}
