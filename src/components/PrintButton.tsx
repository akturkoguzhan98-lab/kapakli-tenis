"use client";
export function PrintButton({ children = "Yazdır / PDF" }: { children?: React.ReactNode }) {
  return <button type="button" onClick={() => window.print()} className="btn-secondary">{children}</button>;
}
