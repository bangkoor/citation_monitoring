import { colorFor } from "@/lib/colors.ts";
import { photoFor } from "@/lib/photos.ts";

export const initials = (name: string) =>
  name.replace(/[^A-Za-z .’']/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Lecturer photo when available, otherwise initials on the division colour. */
export default function Avatar({ name, division, size }: { name: string; division: string | null; size?: number }) {
  const src = photoFor(name);
  const dim = size ? { width: size, height: size, fontSize: Math.round(size * 0.36) } : undefined;
  if (src) {
    return (
      <span className="avatar photo" style={{ ...dim, background: colorFor(division) }} title={name}>
        <img src={src} alt={name} loading="lazy" decoding="async" />
      </span>
    );
  }
  return <span className="avatar" style={{ ...dim, background: colorFor(division) }} title={name}>{initials(name)}</span>;
}
