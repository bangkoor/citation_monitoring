import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Icon from "@/components/Icon.tsx";
import { PillNav, Rail } from "@/components/Nav.tsx";
import ThemeToggle, { themeInitScript } from "@/components/ThemeToggle.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sitasi Dosen KSHE",
  description: "Pemantauan publikasi dan sitasi dosen Departemen Konservasi Sumberdaya Hutan dan Ekowisata, IPB University.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand" aria-label="Beranda: Monitoring Sitasi Dosen KSHE">
              <span className="logo-chip">
                {/* Official department logo, served as the original PNG. */}
                <img src="/logo-kshe.png" alt="Departemen Konservasi Sumberdaya Hutan dan Ekowisata, IPB University" width={8000} height={1359} />
              </span>
              <span className="brand-title">Monitoring<br />Sitasi Dosen</span>
            </Link>
            <Suspense fallback={<nav className="pillnav" />}><PillNav /></Suspense>
            <div className="top-actions">
              <ThemeToggle />
              <a className="icon-btn" href="https://kshe.ipb.ac.id" target="_blank" rel="noopener" aria-label="Website Departemen KSHE" title="Website Departemen KSHE">
                <Icon name="arrow" size={18} />
              </a>
            </div>
          </header>
          <div className="frame">
            <Suspense fallback={<aside className="rail" />}><Rail /></Suspense>
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
