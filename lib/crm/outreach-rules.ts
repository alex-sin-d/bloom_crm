import type { CrmEnums } from "@/lib/crm/types.js";

// ── Business-day helpers (local copy for server-action bundling) ────────────
// The canonical implementations live in business-days.ts (tested directly).

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addBusinessDaysLocal(from: Date, n: number): Date {
  const result = new Date(from);
  let remaining = n;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) remaining--;
  }
  return result;
}

function toLocalDateStringLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type OutreachMethodInput = "email" | "phone";
export type PhoneOutcome = "no_answer" | "voicemail" | "spoke";

export type LogContactInput = {
  direction: "inbound" | "outbound";
  method: OutreachMethodInput;
  phoneOutcome?: PhoneOutcome;
};

export type ActivitySpec = {
  activityType: CrmEnums["activity_type"];
  direction: "inbound" | "outbound";
  outcome: string | null;
};

export type ReminderSpec = {
  dueDateString: string;
  title: string;
};

export type OutreachRuleResult = {
  activity: ActivitySpec;
  newStatus: CrmEnums["outreach_status"];
  reminder: ReminderSpec | null;
};

/**
 * Derive the deterministic activity type, new outreach status, and optional
 * reminder from a logged contact. `from` is the date/time of the logged
 * activity and is used to calculate the reminder due date.
 */
export function deriveOutreachRuleResult(
  input: LogContactInput,
  from: Date
): OutreachRuleResult {
  const { direction, method, phoneOutcome } = input;

  if (method === "email") {
    if (direction === "outbound") {
      return {
        activity: { activityType: "email_sent", direction: "outbound", outcome: null },
        newStatus: "awaiting_reply",
        reminder: {
          dueDateString: toLocalDateStringLocal(addBusinessDaysLocal(from, 3)),
          title: "Send follow-up email"
        }
      };
    }
    return {
      activity: { activityType: "email_received", direction: "inbound", outcome: null },
      newStatus: "reply_received",
      reminder: null
    };
  }

  if (direction === "outbound") {
    if (!phoneOutcome || phoneOutcome === "no_answer") {
      return {
        activity: { activityType: "call_attempted", direction: "outbound", outcome: "No answer" },
        newStatus: "follow_up_due",
        reminder: {
          dueDateString: toLocalDateStringLocal(addBusinessDaysLocal(from, 1)),
          title: "Follow up after missed call"
        }
      };
    }

    if (phoneOutcome === "voicemail") {
      return {
        activity: {
          activityType: "voicemail_left",
          direction: "outbound",
          outcome: "Left voicemail"
        },
        newStatus: "follow_up_due",
        reminder: {
          dueDateString: toLocalDateStringLocal(addBusinessDaysLocal(from, 1)),
          title: "Follow up after voicemail"
        }
      };
    }

    return {
      activity: {
        activityType: "call_completed",
        direction: "outbound",
        outcome: "Spoke with contact"
      },
      newStatus: "spoke_by_phone",
      reminder: null
    };
  }

  return {
    activity: {
      activityType: "call_completed",
      direction: "inbound",
      outcome: "Spoke with contact"
    },
    newStatus: "spoke_by_phone",
    reminder: null
  };
}

/**
 * When a follow-up task in position `completedStep` (1-indexed) is completed,
 * return the next reminder spec or null if the sequence is finished.
 *
 * Step 1 (first follow-up) completes → create step 2 due +5 business days
 * Step 2 (second follow-up) completes → no third reminder
 */
export function deriveNextReminderAfterCompletion(
  completedStep: number,
  completedAt: Date
): ReminderSpec | null {
  if (completedStep === 1) {
    return {
      dueDateString: toLocalDateStringLocal(addBusinessDaysLocal(completedAt, 5)),
      title: "Send second follow-up email"
    };
  }
  return null;
}
