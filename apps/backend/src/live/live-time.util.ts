/**
 * Shared time-of-day helpers for live scheduling.
 *
 * Availability windows store a recurring time-of-day on a fixed UTC base date
 * (1970-01-01). A window whose end time-of-day is earlier than its start
 * time-of-day represents a window that crosses midnight (e.g. 23:00 → 01:00).
 */

const AVAILABILITY_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parse an availability time input ("HH:mm" or a full ISO string) into a Date. "HH:mm" is stored on a fixed UTC base date. */
export function toAvailabilityDate(value: string): Date {
  const match = AVAILABILITY_TIME_RE.exec(value);
  if (match) {
    const [, hh, mm] = match;
    return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
  }
  return new Date(value);
}

/** Render a stored availability Date as the canonical UTC time-of-day "HH:mm". */
export function toTimeOfDay(date: Date): string {
  return date.toISOString().slice(11, 16);
}

/** Minutes since midnight of a fixed-base availability Date (0..1439). */
export function minutesOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/** Combine a target date ("YYYY-MM-DD") with an availability time-of-day into a concrete UTC Date. */
export function sessionTimeForDate(dateStr: string, availabilityDate: Date): Date {
  return new Date(`${dateStr}T${toTimeOfDay(availabilityDate)}:00.000Z`);
}

/** A window is valid when it has a positive duration; end < start means it crosses midnight. */
export function isValidWindow(start: Date, end: Date): boolean {
  return minutesOfDay(start) !== minutesOfDay(end);
}

/** True when minute `m` falls inside the circular window [start, end). Handles end < start (cross-midnight). */
function inside(minute: number, start: number, end: number): boolean {
  if (end > start) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

/** Circular overlap between two recurring windows on the same day-of-week. Handles cross-midnight windows. */
export function circularWindowsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  const sa = minutesOfDay(aStart);
  const ea = minutesOfDay(aEnd);
  const sb = minutesOfDay(bStart);
  const eb = minutesOfDay(bEnd);
  return inside(sb, sa, ea) || inside(sa, sb, eb);
}

/** Concrete session start/end for a date; a cross-midnight end rolls to the next day. */
export function sessionTimesForDate(
  dateStr: string,
  start: Date,
  end: Date,
): { startTime: Date; endTime: Date } {
  const startTime = sessionTimeForDate(dateStr, start);
  const endTime = sessionTimeForDate(dateStr, end);
  if (minutesOfDay(end) < minutesOfDay(start)) {
    endTime.setUTCDate(endTime.getUTCDate() + 1);
  }
  return { startTime, endTime };
}
