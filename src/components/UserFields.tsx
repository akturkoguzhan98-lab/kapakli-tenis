import { ROLE_LABEL } from "@/lib/labels";
import { Field } from "./ui";

type U = { name: string; email: string; phone: string | null; role: string; active: boolean; hourlyRate: number; notifyConsent: boolean };

export function UserFields({ u, isNew }: { u?: U; isNew?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ad soyad *"><input name="name" required defaultValue={u?.name} className="input" /></Field>
      <Field label="Rol">
        <select name="role" defaultValue={u?.role ?? "PARENT"} className="input">
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="E-posta (giriş için) *"><input name="email" type="email" required defaultValue={u?.email} className="input" /></Field>
      <Field label="Telefon"><input name="phone" type="tel" defaultValue={u?.phone ?? ""} className="input" /></Field>
      <Field label={isNew ? "Şifre * (en az 8 karakter)" : "Yeni şifre (değiştirmek için doldurun)"}>
        <input name="password" type="text" minLength={8} required={isNew} autoComplete="off" className="input" />
      </Field>
      {!isNew && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={u?.active} className="h-4 w-4" /> Hesap aktif
        </label>
      )}
      <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold text-stone-600">WhatsApp bildirimleri (veliler için)</legend>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="notifyConsent" defaultChecked={u?.notifyConsent ?? true} className="h-4 w-4" /> Aidat/ders hatırlatmalarını WhatsApp'tan almayı kabul ediyor
        </label>
        <p className="text-xs text-stone-500 sm:col-span-2">Mesajlar yukarıdaki telefon numarasının WhatsApp hesabına gider.</p>
      </fieldset>
      <Field label="Saatlik ders ücreti (antrenörler için, TL)">
        <input name="hourlyRate" type="number" min={0} step={50} defaultValue={u?.hourlyRate ?? 0} className="input" />
      </Field>
    </div>
  );
}
