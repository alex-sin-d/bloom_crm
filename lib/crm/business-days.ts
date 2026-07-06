/**
 * Business-day arithmetic — v1 skips Saturday and Sunday only.
 * No statutory holiday calendar is included.
 */

import {
  addCrmBusinessDays,
  isCrmWeekend,
  toCrmDateString
} from "@/lib/crm/format";

/**
 * Add `n` business days (Mon–Fri) to `from` using the CRM calendar.
 * Returns a new Date without mutating `from`.
 */
export function addBusinessDays(from: Date, n: number): Date {
  return addCrmBusinessDays(from, n);
}

/**
 * Format a Date as a YYYY-MM-DD string in CRM local time, matching the `date`
 * column type Supabase returns for `tasks.due_date`.
 */
export function toLocalDateString(date: Date): string {
  return toCrmDateString(date);
}

export function isWeekend(date: Date): boolean {
  return isCrmWeekend(date);
}
