// Backend stores timestamps in UTC (SQLite returns them without a timezone
// suffix). We render everything in Korea Standard Time (Asia/Seoul, UTC+9)
// using the built-in Intl timezone support — no external library required.

const TZ = "Asia/Seoul";

function toUtcDate(ts: string): Date {
  // If the string has no timezone marker, it's naive UTC from the backend —
  // append "Z" so it's parsed as UTC rather than the browser's local time.
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(ts);
  return new Date(hasTz ? ts : `${ts}Z`);
}

const fmtHMS = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const fmtHM = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "HH:mm:ss" in Korea time from a backend (UTC) timestamp string. */
export const kstTime = (ts: string): string => fmtHMS.format(toUtcDate(ts));

/** "HH:mm" in Korea time from a backend (UTC) timestamp string. */
export const kstHM = (ts: string): string => fmtHM.format(toUtcDate(ts));

/** Current wall-clock time in Korea, "HH:mm:ss". */
export const kstNow = (): string => fmtHMS.format(new Date());
