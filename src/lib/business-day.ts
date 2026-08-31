const TAIPEI = "Asia/Taipei";

const taipeiClock = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIPEI,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function taipeiParts(at: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = Object.fromEntries(
    taipeiClock.formatToParts(at).map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** iCHEF checkout `YYYY/MM/DD HH:mm:ss` or punch `YYYY-MM-DD HH:mm:ss`, as Asia/Taipei wall time. */
export function parseIchefDateTime(raw: string): Date | null {
  const trimmed = raw.trim();
  const slash = trimmed.match(
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  const dash = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  const m = slash ?? dash;
  if (!m) {
    return null;
  }
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+08:00`);
}

export function isInPayPeriod(at: Date, start: Date, end: Date): boolean {
  return at.getTime() >= start.getTime() && at.getTime() < end.getTime();
}
