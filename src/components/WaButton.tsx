"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * WhatsApp'ı hazır mesajla yeni sekmede açar ve gönderimi kaydeder (POST /wa-gonder),
 * ardından listeyi yeniler (durum "Elle gönderildi" olur).
 */
export function WaButton({ href, sent, primary }: { href: string; sent?: boolean; primary?: boolean }) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  return (
    <form
      method="post"
      action={href}
      target="_blank"
      onSubmit={() => {
        setOpened(true);
        setTimeout(() => router.refresh(), 1500);
      }}
    >
      <button
        type="submit"
        className={`${primary && !sent && !opened ? "btn-primary" : "btn-secondary"} btn-sm whitespace-nowrap`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        {opened ? "Açıldı ✓" : sent ? "Tekrar gönder" : "WhatsApp'ta gönder"}
      </button>
    </form>
  );
}
