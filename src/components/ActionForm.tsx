"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/forms";

type Props = {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  /** Başarılı gönderimden sonra formu temizle */
  resetOnSuccess?: boolean;
};

/** Sunucu aksiyonunu çağıran, hata/başarı mesajını gösteren form. */
export function ActionForm({ action, children, className, resetOnSuccess }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}
      {state?.ok && <p className="mt-3 rounded-lg bg-lime-300/15 px-3 py-2 text-sm text-lime-200">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Kaydediliyor…" : children}
    </button>
  );
}

/** Onay soran basit buton (iptal/silme işlemleri için) */
export function ConfirmButton({ children, message, className = "btn-danger btn-sm" }: { children: React.ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
