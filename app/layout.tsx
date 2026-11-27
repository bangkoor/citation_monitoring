import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sitasi Dosen KSHE",
  description: "Pemantauan publikasi dan sitasi dosen Departemen Konservasi Sumberdaya Hutan dan Ekowisata, IPB University.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              Sitasi Dosen KSHE
              <small>Departemen Konservasi Sumberdaya Hutan dan Ekowisata · IPB University</small>
            </Link>
            <nav className="nav">
              <Link href="/">Ringkasan</Link>
              <Link href="/dosen">Dosen</Link>
              <Link href="/divisi/EMHL">Divisi</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
