import type { CrmEnums } from "./types.js";

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addBusinessDaysLocal(from: Date, n: number) {
  if (n < 0) {
    throw new RangeError("addBusinessDaysLocal: n must be non-negative");
  }

  const result = new Date(from);
  let remaining = n;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) remaining--;
  }
  return result;
}

function toLocalDateStringLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const TASK_VIEW_VALUES = [
  "my",
  "open",
  "today",
  "overdue",
  "upcoming",
  "completed"
] as const;

export type TaskView = (typeof TASK_VIEW_VALUES)[number];

export const TASK_TYPE_VALUES = [
  "email_follow_up_1",
  "email_follow_up_2",
  "phone_callback",
  "manual_task"
] as const;

export type TaskTypeKey = (typeof TASK_TYPE_VALUES)[number] | "other";

export type TaskDueGroupKey = "overdue" | "today" | "upcoming" | "no_due_date";

export type TaskLogicRow = {
  assignedUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  dueAt: string | null;
  dueDate: string | null;
  id: string;
  organizationName: string | null;
  relatedActivityId: string | null;
  status: CrmEnums["task_status"];
  taskKind: CrmEnums["task_kind"];
  title: string;
};

export type TaskActivityLogicRow = {
  activityType: CrmEnums["activity_type"];
  id: string;
};

export type TaskFilterableRow = TaskLogicRow & {
  contactLabel: string | null;
  contactLinked: boolean;
  organizationId: string | null;
  organizationType: CrmEnums["organization_type"] | null;
  opportunityName: string | null;
  taskTypeKey: TaskTypeKey;
};

export type TaskSummaryCounts = {
  dueToday: number;
  overdue: number;
  unassigned: number;
  upcoming: number;
};

export function getLocalTodayString(now = new Date()) {
  return toLocalDateStringLocal(now);
}

export function isOpenTaskStatus(status: CrmEnums["task_status"]) {
  return status !== "completed" && status !== "cancelled";
}

export function getTaskDueGroup(
  dueDate: string | null,
  today: string
): TaskDueGroupKey {
  if (!dueDate) return "no_due_date";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

export function getTaskDueGroupLabel(group: TaskDueGroupKey) {
  const labels: Record<TaskDueGroupKey, string> = {
    no_due_date: "No due date",
    overdue: "Overdue",
    today: "Due today",
    upcoming: "Upcoming"
  };
  return labels[group];
}

export function getTaskTypeLabel(type: TaskTypeKey) {
  const labels: Record<TaskTypeKey, string> = {
    email_follow_up_1: "Email follow-up 1",
    email_follow_up_2: "Email follow-up 2",
    manual_task: "Manual task",
    other: "Task",
    phone_callback: "Phone callback"
  };
  return labels[type];
}

export function isEmailOutreachActivity(
  activityType: CrmEnums["activity_type"] | null | undefined
) {
  return activityType === "email_sent";
}

export function isPhoneCallbackActivity(
  activityType: CrmEnums["activity_type"] | null | undefined
) {
  return activityType === "call_attempted" || activityType === "voicemail_left";
}

function relatedFollowUpTasks(task: TaskLogicRow, allTasks: TaskLogicRow[]) {
  if (!task.relatedActivityId) return [];
  return allTasks
    .filter(
      (candidate) =>
        candidate.relatedActivityId === task.relatedActivityId &&
        candidate.taskKind === "follow_up"
    )
    .sort(compareTaskSequence);
}

function compareTaskSequence(left: TaskLogicRow, right: TaskLogicRow) {
  return (
    left.createdAt.localeCompare(right.createdAt) ||
    (left.dueDate ?? "").localeCompare(right.dueDate ?? "") ||
    left.id.localeCompare(right.id)
  );
}

export function getEmailFollowUpStep(
  task: TaskLogicRow,
  activity: TaskActivityLogicRow | null | undefined,
  allTasks: TaskLogicRow[]
) {
  if (task.taskKind !== "follow_up" || !isEmailOutreachActivity(activity?.activityType)) {
    return null;
  }

  const sequence = relatedFollowUpTasks(task, allTasks);
  const index = sequence.findIndex((candidate) => candidate.id === task.id);
  return index >= 0 ? index + 1 : 1;
}

export function deriveTaskTypeKey(
  task: TaskLogicRow,
  activity: TaskActivityLogicRow | null | undefined,
  allTasks: TaskLogicRow[]
): TaskTypeKey {
  if (task.taskKind === "custom") {
    return "manual_task";
  }

  if (task.taskKind === "call" || isPhoneCallbackActivity(activity?.activityType)) {
    return "phone_callback";
  }

  const emailStep = getEmailFollowUpStep(task, activity, allTasks);
  if (emailStep) {
    return emailStep >= 2 ? "email_follow_up_2" : "email_follow_up_1";
  }

  return "other";
}

export function sortOpenTasks<T extends TaskLogicRow>(tasks: T[]) {
  return [...tasks].sort((left, right) => {
    const leftDue = left.dueDate ?? "9999-12-31";
    const rightDue = right.dueDate ?? "9999-12-31";
    return (
      leftDue.localeCompare(rightDue) ||
      (left.organizationName ?? "").localeCompare(right.organizationName ?? "") ||
      left.createdAt.localeCompare(right.createdAt)
    );
  });
}

export function sortCompletedTasks<T extends TaskLogicRow>(tasks: T[]) {
  return [...tasks].sort((left, right) =>
    (right.completedAt ?? "").localeCompare(left.completedAt ?? "")
  );
}

export function filterTasksForView<T extends TaskLogicRow>(
  tasks: T[],
  view: TaskView,
  currentProfileId: string,
  today: string
) {
  return tasks.filter((task) => {
    const isOpen = isOpenTaskStatus(task.status);
    if (view === "my") return isOpen && task.assignedUserId === currentProfileId;
    if (view === "open") return isOpen;
    if (view === "today") return isOpen && task.dueDate === today;
    if (view === "overdue") return isOpen && Boolean(task.dueDate) && task.dueDate! < today;
    if (view === "upcoming") return isOpen && Boolean(task.dueDate) && task.dueDate! > today;
    return task.status === "completed";
  });
}

export function getTaskSummaryCounts<T extends TaskLogicRow>(
  tasks: T[],
  today: string
): TaskSummaryCounts {
  return tasks.reduce<TaskSummaryCounts>(
    (counts, task) => {
      if (!isOpenTaskStatus(task.status)) return counts;
      if (!task.assignedUserId) counts.unassigned += 1;
      if (task.dueDate === today) counts.dueToday += 1;
      if (task.dueDate && task.dueDate < today) counts.overdue += 1;
      if (task.dueDate && task.dueDate > today) counts.upcoming += 1;
      return counts;
    },
    { dueToday: 0, overdue: 0, unassigned: 0, upcoming: 0 }
  );
}

export function taskMatchesSearch(task: TaskFilterableRow, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    task.title,
    task.organizationName,
    task.opportunityName,
    task.contactLabel
  ].some((value) => value?.toLowerCase().includes(normalized));
}

export function getQuickRescheduleDate(
  choice: "tomorrow" | "3bd" | "5bd",
  from = new Date()
) {
  if (choice === "tomorrow") {
    const tomorrow = new Date(from);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toLocalDateStringLocal(tomorrow);
  }

  return toLocalDateStringLocal(addBusinessDaysLocal(from, choice === "3bd" ? 3 : 5));
}

export function buildDueAtIso(dueDate: string, dueTime: string | null | undefined) {
  const trimmedTime = dueTime?.trim();
  if (!trimmedTime) return null;

  const dueAt = new Date(`${dueDate}T${trimmedTime}:00`);
  if (Number.isNaN(dueAt.getTime())) return null;
  return dueAt.toISOString();
}
