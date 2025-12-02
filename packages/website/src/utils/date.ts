/**
 * Convert a Date to datetime-local input format (YYYY-MM-DDTHH:mm)
 */
export function dateToLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert a datetime-local string to ISO string
 */
export function localDateTimeToISO(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return date.toISOString();
}

/**
 * Format a date with full weekday, date, and time
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format just the time portion of a date
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Create a Date with specific time on a given date
 */
export function createDateWithTime(
  baseDate: Date,
  hours: number,
  minutes: number = 0
): Date {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0
  );
}
