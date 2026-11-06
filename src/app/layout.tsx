import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kapaklı Tenis Akademi",
  description: "Öğrenci, ders, kort ve aidat yönetimi",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#24663f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
