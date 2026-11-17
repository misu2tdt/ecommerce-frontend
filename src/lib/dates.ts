// The only place that formats dates. Every date in the store is shown in
// Vietnam time in one fixed English format, whatever the time zone or language of
// the server or the visitor, so server and browser print identical text (no
// hydration mismatch). A guard test fails on date formatting anywhere else.

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// Numeric parts only: month names come from the list above, because the names
// the engine gives for a locale differ between versions ("Sep" and "Sept").
const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const UNAVAILABLE = "Date unavailable";

interface DateParts {
  day: number;
  month: number;
  year: number;
  hour: string;
  minute: string;
}

function readParts(value: string): DateParts | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const byType = new Map(
    partsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    day: Number(byType.get("day")),
    month: Number(byType.get("month")),
    year: Number(byType.get("year")),
    // Some engines print midnight as "24"; hourCycle h23 asks for "00".
    hour: (byType.get("hour") ?? "00").replace(/^24$/, "00").padStart(2, "0"),
    minute: (byType.get("minute") ?? "00").padStart(2, "0"),
  };
}

// "3 Nov 2026, 02:13"
export function formatDateTime(value: string): string {
  const parts = readParts(value);
  if (!parts) return UNAVAILABLE;
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

// "3 Nov 2026"
export function formatDate(value: string): string {
  const parts = readParts(value);
  if (!parts) return UNAVAILABLE;
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Today's calendar date in Vietnam, as "2026-11-17".
export function todayInVietnam(now: Date = new Date()): string {
  const parts = readParts(now.toISOString());
  if (!parts) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function readCalendarDay(day: string) {
  const match = CALENDAR_DAY.exec(day);
  if (!match) return null;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, date));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== date
  ) {
    return null;
  }
  return { year, month, date, weekday: check.getUTCDay() };
}

// A calendar day the backend sends as text ("2026-11-17"): no time zone is
// involved, so the text is read, never converted. "17 Nov 2026"
export function formatCalendarDay(day: string): string {
  const parts = readCalendarDay(day);
  if (!parts) return UNAVAILABLE;
  return `${parts.date} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

// "17 Nov": for a crowded axis.
export function formatCalendarDayShort(day: string): string {
  const parts = readCalendarDay(day);
  if (!parts) return UNAVAILABLE;
  return `${parts.date} ${MONTHS[parts.month - 1]}`;
}

// "Tue 17 Nov 2026"
export function formatCalendarDayLong(day: string): string {
  const parts = readCalendarDay(day);
  if (!parts) return UNAVAILABLE;
  return `${WEEKDAYS[parts.weekday]} ${formatCalendarDay(day)}`;
}

// "3 Nov 2026, 02:43 (Vietnam time)": a deadline names its time zone.
export function formatPaymentDeadline(value: string): string {
  const text = formatDateTime(value);
  return text === UNAVAILABLE ? text : `${text} (Vietnam time)`;
}
