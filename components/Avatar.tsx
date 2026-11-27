import { colorFor } from "@/lib/colors.ts";

export const initials = (name: string) =>
  name.replace(/[^A-Za-z .’']/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function Avatar({ name, division }: { name: string; division: string | null }) {
  return <span className="avatar" style={{ background: colorFor(division) }} title={name}>{initials(name)}</span>;
}
