/**
 * utils.js
 * Small formatting/helper functions shared across pages.
 */

export const ACADEMY_NAME = "Chithramaya School of Arts";

export function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `\u20B9${n.toLocaleString("en-IN")}`;
}

export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function formatTime(hhmm) {
  if (!hhmm) return "-";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function apiErrorMessage(err) {
  return err?.response?.data?.detail || err?.message || "Something went wrong";
}

export function uploadUrl(path) {
  if (!path) return null;
  return `/uploads/${path}`;
}

// Monday=0 ... Sunday=6, matching the backend's day_of_week convention
// (Python's date.weekday()).
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Half-hour increments for the schedule-pattern time dropdowns. */
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export function currentBillingMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08" -> "August 2026" */
export function formatBillingMonth(ym) {
  if (!ym) return "-";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Last 12 billing months (including current), newest first — for the
 * student fee submission month picker. */
export function recentBillingMonths(count = 12) {
  const months = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

// Calendar dot colors, matching the spec: present=green, leave=yellow,
// holiday=blue, compensation=purple.
export const CALENDAR_COLORS = {
  present: "#22c55e",
  leave: "#eab308",
  holiday: "#3b82f6",
  compensation: "#a855f7",
  regular: "#94a3b8", // not yet marked
};

// Attendance star indicator colors: green=100%, blue=50-99%, red=<50%.
export const STAR_COLORS = { green: "#22c55e", blue: "#3b82f6", red: "#ef4444" };

export const LEAVE_REASON_CATEGORIES = [
  "Personal Reason", "Medical Reason", "Family Emergency",
  "Academic/College Commitment", "Work/Professional Commitment", "Travel", "Other",
];

/** Last N calendar months (including current), newest first, as
 * {year, month, label} — for the Monthly Reports month picker. */
export function recentMonths(count = 12) {
  const months = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) });
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}
