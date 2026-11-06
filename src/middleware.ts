import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session";

// Giriş yapmamış kullanıcıları giriş sayfasına yönlendirir.
// Rol kontrolü her sayfada ve sunucu aksiyonunda ayrıca yapılır.
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const path = req.nextUrl.pathname;
  // /cikis ve zamanlanmış görev uç noktası (kendi gizli anahtarıyla korunur) oturum gerektirmez
  if (path.startsWith("/cikis") || path.startsWith("/api/cron/") || path.startsWith("/kurulum")) return NextResponse.next();
  const isLogin = path.startsWith("/giris");
  if (!session && !isLogin) {
    return NextResponse.redirect(new URL("/giris", req.url));
  }
  if (session && isLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
