"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Runs before paint (inlined in <head>) so the saved theme applies without a flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

function current(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(current()), []);

  const flip = () => {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  };

  const dark = theme === "dark";
  return (
    <button type="button" className="theme-switch" role="switch" aria-checked={dark}
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"} title={dark ? "Mode terang" : "Mode gelap"} onClick={flip}>
      <span className="ts-icon sun" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      </span>
      <span className="ts-icon moon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      </span>
      <span className="ts-knob" data-on={dark || undefined} />
    </button>
  );
}
