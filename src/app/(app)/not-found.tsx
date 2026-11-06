import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold">Sayfa bulunamadı</h1>
      <Link href="/" className="link mt-3 inline-block">Ana sayfaya dön</Link>
    </div>
  );
}
