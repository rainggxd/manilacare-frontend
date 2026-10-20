import { Megaphone, ShieldAlert, HeartPulse, CalendarDays } from "lucide-react";

/**
 * Shared settings for announcements: the four categories, their colors
 * and icons. Used by the landing page and the Admin "Announcements" page.
 */
export const ANNOUNCEMENT_CATEGORIES = [
  { value: "Announcement", label: "Announcement", plural: "Announcements", color: "#0B3D7A", soft: "#E7EEF7", icon: Megaphone },
  { value: "Disease Advisory", label: "Disease Advisory", plural: "Disease Advisories", color: "#8A3B27", soft: "#FBEAE5", icon: ShieldAlert },
  { value: "Schedule", label: "Schedule", plural: "Schedules", color: "#8A6D00", soft: "#FBF3D9", icon: CalendarDays },
  { value: "Health Tip", label: "Health Tip", plural: "Health Tips", color: "#1B5E20", soft: "#E8F3E9", icon: HeartPulse },
];

export function categoryStyle(category) {
  return ANNOUNCEMENT_CATEGORIES.find((c) => c.value === category) ?? ANNOUNCEMENT_CATEGORIES[0];
}

/** "2026-10-20" -> "October 20, 2026" */
export function formatPostDate(value) {
  if (!value) return "";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** First part of a long text, cut at a word, for card previews. */
export function excerpt(text, max = 140) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", max)) + "…";
}
