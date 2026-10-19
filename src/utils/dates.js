/**
 * Date helpers that use the computer's local time (Philippine time).
 *
 * Why not toISOString()? toISOString() converts to UTC first. Manila is
 * UTC+8, so from 12:00 AM to 7:59 AM it would still return yesterday's
 * date. These helpers always give the correct local date.
 */

/** Returns "YYYY-MM-DD" for the given date (default: today). */
export function localISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Turns any date value from the API into "YYYY-MM-DD" (local time). */
export function toLocalISO(value) {
  if (!value) return "";
  // Plain "YYYY-MM-DD" strings are already a calendar date, keep them as is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : localISO(d);
}

/** "2026-10-19" -> "Oct 19, 2026" */
export function formatLongDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "14:30:00" -> "2:30 PM" */
export function formatTime(value) {
  if (!value) return "—";
  const [h, m] = String(value).split(":").map(Number);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}
