import type { AppRole } from "./auth";

export const URGENCY_COLORS: Record<string, string> = {
  critical: "text-bio-coral border-bio-coral/40 bg-bio-coral/10",
  high: "text-bio-amber border-bio-amber/40 bg-bio-amber/10",
  medium: "text-bio-cyan border-bio-cyan/40 bg-bio-cyan/10",
  low: "text-bio-green border-bio-green/40 bg-bio-green/10",
};

export function urgencyLabel(score: number | null | undefined): "low" | "medium" | "high" | "critical" {
  const s = score ?? 0;
  if (s >= 86) return "critical";
  if (s >= 61) return "high";
  if (s >= 31) return "medium";
  return "low";
}

export const ROLE_LABEL: Record<AppRole, string> = {
  donor: "Donor / Source",
  ngo: "NGO / Recipient",
  admin: "Platform Admin",
};

export function minutesUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
}

export function formatTimeLeft(iso: string): string {
  const m = minutesUntil(iso);
  if (m < 1) return "Expired";
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return `${h}h ${rem}m left`;
  return `${Math.floor(h / 24)}d left`;
}
