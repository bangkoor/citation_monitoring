"use client";
import { useState } from "react";

/** Downloads the xlsx export, showing progress while the file is generated. */
export default function ExportButton({ href, label = "Unduh xlsx" }: { href: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "sitasi-kshe.xlsx";
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Gagal mengunduh. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="export">
      <button type="button" className="btn primary" onClick={download} disabled={busy} aria-busy={busy}>
        {busy ? <><span className="spinner light" aria-hidden />Menyiapkan file…</> : label}
      </button>
      {error && <span className="err" role="alert">{error}</span>}
    </span>
  );
}
