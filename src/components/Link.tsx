"use client";

// Next.js bağlantısı, önceden yükleme (prefetch) KAPALI olarak.
// Next.js varsayılan olarak ekranda görünen her bağlantının sayfasını arka planda yükler; bu, her
// sayfa açılışında 8–28 ek sunucu isteği demek. Cloudflare ücretsiz planında istek ve işlemci
// süresi sınırlı olduğu için sayfalar yalnızca tıklanınca yüklenir.
import NextLink from "next/link";
import type { ComponentProps } from "react";

export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
