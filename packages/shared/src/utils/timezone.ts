export const PLATFORM_TIMEZONE = "Africa/Cairo";

const PARTS_TYPES = ["year", "month", "day", "hour", "minute", "second"] as const;
type DateTimePartType = (typeof PARTS_TYPES)[number];

function formatParts(date: Date, timeZone: string): Record<DateTimePartType, string> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const result = {} as Record<DateTimePartType, string>;
  for (const type of PARTS_TYPES) {
    result[type] = parts.find((p) => p.type === type)?.value ?? "00";
  }
  return result;
}

export function getDateInTimeZone(date: Date, timeZone: string = PLATFORM_TIMEZONE): string {
  const { year, month, day } = formatParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function getTimeInTimeZone(date: Date, timeZone: string = PLATFORM_TIMEZONE): string {
  const { hour, minute } = formatParts(date, timeZone);
  return `${hour}:${minute}`;
}

export function toLocalIsoInTimeZone(date: Date, timeZone: string = PLATFORM_TIMEZONE): string {
  const { year, month, day, hour, minute, second } = formatParts(date, timeZone);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export function combineLocalDateAndTime(
  date: string,
  time: string,
  timeZone: string = PLATFORM_TIMEZONE,
): Date {
  const [year, month, day] = date.split("-").map((v) => Number(v));
  const [hour, minute] = time.split(":").map((v) => Number(v));
  const targetUtc = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0);

  let candidate = targetUtc;
  for (let i = 0; i < 2; i += 1) {
    const { year: y, month: m, day: d, hour: h, minute: mi, second: s } = formatParts(
      new Date(candidate),
      timeZone,
    );
    const representedUtc = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(mi), Number(s));
    const offsetMs = representedUtc - candidate;
    candidate = targetUtc - offsetMs;
  }
  return new Date(candidate);
}
