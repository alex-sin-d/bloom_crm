/**
 * Business-day arithmetic — v1 skips Saturday and Sunday only.
 * No statutory holiday calendar is included.
 */

/**
 * Return true if `date` falls on a Saturday or Sunday.
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Add `n` business days (Mon–Fri) to `from`.
 * Returns a new Date without mutating `from`.
 */
export function addBusinessDays(from: Date, n: number): Date {
  if (n < 0) {
    throw new RangeError("addBusinessDays: n must be non-negative");
  }

  const result = new Date(from);
  let remaining = n;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      remaining--;
    }
  }

  return result;
}

/**
 * Format a Date as a YYYY-MM-DD string in local time, matching the `date`
 * column type Supabase returns for `tasks.due_date`.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
