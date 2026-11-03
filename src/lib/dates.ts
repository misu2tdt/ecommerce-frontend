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

// "3 Nov 2026, 02:43 (Vietnam time)": a deadline names its time zone.
export function formatPaymentDeadline(value: string): string {
  const text = formatDateTime(value);
  return text === UNAVAILABLE ? text : `${text} (Vietnam time)`;
}
