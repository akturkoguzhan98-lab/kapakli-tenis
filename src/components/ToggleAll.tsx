"use client";

/** Aynı formdaki tüm "key" kutucuklarını işaretler / kaldırır */
export function ToggleAll() {
  return (
    <input
      type="checkbox"
      defaultChecked
      aria-label="Tümünü seç"
      className="h-4 w-4"
      onChange={(e) => {
        e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="key"]:not(:disabled)').forEach((c) => (c.checked = e.currentTarget.checked));
      }}
    />
  );
}
