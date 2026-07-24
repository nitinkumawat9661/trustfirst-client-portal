const INDIA_TIME_ZONE = "Asia/Kolkata";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function currentIndiaBusinessDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const start = new Date(`${value.year}-${value.month}-${value.day}T00:00:00+05:30`);
  return {
    gte: start,
    lt: new Date(start.getTime() + DAY_IN_MILLISECONDS),
  };
}
