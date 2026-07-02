import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDueAtIso,
  deriveTaskTypeKey,
  filterTasksForView,
  getQuickRescheduleDate,
  getTaskDueGroup,
  getTaskSummaryCounts,
  sortCompletedTasks,
  sortOpenTasks,
  taskMatchesSearch,
  type TaskActivityLogicRow,
  type TaskFilterableRow,
  type TaskLogicRow
} from "../../lib/crm/task-logic.js";

function task(overrides: Partial<TaskLogicRow> = {}): TaskLogicRow {
  return {
    assignedUserId: "alex",
    completedAt: null,
    createdAt: "2026-06-25T10:00:00.000Z",
    dueAt: null,
    dueDate: "2026-06-30",
    id: "task-1",
    organizationName: "Holy Cross High School",
    relatedActivityId: null,
    status: "open",
    taskKind: "custom",
    title: "Manual task",
    ...overrides
  };
}

function filterable(overrides: Partial<TaskFilterableRow> = {}): TaskFilterableRow {
  const base = task(overrides);
  return {
    ...base,
    contactLabel: null,
    contactLinked: false,
    organizationId: "org-1",
    organizationType: "school",
    opportunityName: "Graduation outreach",
    taskTypeKey: "manual_task",
    ...overrides
  };
}

describe("task due buckets and counts", () => {
  const today = "2026-06-30";

  it("calculates due-today, overdue, upcoming, and no-date groups", () => {
    assert.equal(getTaskDueGroup("2026-06-29", today), "overdue");
    assert.equal(getTaskDueGroup("2026-06-30", today), "today");
    assert.equal(getTaskDueGroup("2026-07-01", today), "upcoming");
    assert.equal(getTaskDueGroup(null, today), "no_due_date");
  });

  it("summary counts ignore completed and cancelled tasks", () => {
    const counts = getTaskSummaryCounts(
      [
        task({ dueDate: today }),
        task({ dueDate: "2026-06-29", id: "overdue" }),
        task({ dueDate: "2026-07-01", id: "upcoming" }),
        task({ assignedUserId: null, id: "unassigned" }),
        task({ id: "done", status: "completed", completedAt: "2026-06-30T12:00:00.000Z" }),
        task({ id: "cancelled", status: "cancelled" })
      ],
      today
    );

    assert.deepEqual(counts, {
      dueToday: 2,
      overdue: 1,
      unassigned: 1,
      upcoming: 1
    });
  });
});

describe("task view filtering", () => {
  const today = "2026-06-30";
  const tasks = [
    task({ assignedUserId: "alex", dueDate: today, id: "mine-today" }),
    task({ assignedUserId: "sam", dueDate: today, id: "sam-today" }),
    task({ assignedUserId: null, dueDate: "2026-06-29", id: "unassigned-overdue" }),
    task({ dueDate: "2026-07-01", id: "upcoming" }),
    task({ completedAt: "2026-06-30T12:00:00.000Z", id: "done", status: "completed" })
  ];

  it("filters My tasks to the signed-in founder", () => {
    assert.deepEqual(
      filterTasksForView(tasks, "my", "alex", today).map((row) => row.id),
      ["mine-today", "upcoming"]
    );
  });

  it("filters All open, Due today, Overdue, Upcoming, and Completed", () => {
    assert.deepEqual(
      filterTasksForView(tasks, "open", "alex", today).map((row) => row.id),
      ["mine-today", "sam-today", "unassigned-overdue", "upcoming"]
    );
    assert.deepEqual(
      filterTasksForView(tasks, "today", "alex", today).map((row) => row.id),
      ["mine-today", "sam-today"]
    );
    assert.deepEqual(
      filterTasksForView(tasks, "overdue", "alex", today).map((row) => row.id),
      ["unassigned-overdue"]
    );
    assert.deepEqual(
      filterTasksForView(tasks, "upcoming", "alex", today).map((row) => row.id),
      ["upcoming"]
    );
    assert.deepEqual(
      filterTasksForView(tasks, "completed", "alex", today).map((row) => row.id),
      ["done"]
    );
  });
});

describe("task type derivation", () => {
  const emailActivity: TaskActivityLogicRow = {
    activityType: "email_sent",
    id: "activity-email"
  };
  const phoneActivity: TaskActivityLogicRow = {
    activityType: "call_attempted",
    id: "activity-phone"
  };

  it("labels manual tasks from task_kind=custom", () => {
    assert.equal(deriveTaskTypeKey(task({ taskKind: "custom" }), null, []), "manual_task");
  });

  it("derives Email Follow-up 1 and 2 from related email activity sequence", () => {
    const first = task({
      createdAt: "2026-06-30T10:00:00.000Z",
      id: "follow-1",
      relatedActivityId: "activity-email",
      taskKind: "follow_up"
    });
    const second = task({
      createdAt: "2026-07-06T10:00:00.000Z",
      id: "follow-2",
      relatedActivityId: "activity-email",
      taskKind: "follow_up"
    });

    assert.equal(deriveTaskTypeKey(first, emailActivity, [first, second]), "email_follow_up_1");
    assert.equal(deriveTaskTypeKey(second, emailActivity, [first, second]), "email_follow_up_2");
  });

  it("derives phone callbacks from missed-call and voicemail activities", () => {
    assert.equal(
      deriveTaskTypeKey(
        task({ relatedActivityId: "activity-phone", taskKind: "follow_up" }),
        phoneActivity,
        []
      ),
      "phone_callback"
    );
    assert.equal(
      deriveTaskTypeKey(
        task({ taskKind: "follow_up" }),
        { activityType: "voicemail_left", id: "activity-voicemail" },
        []
      ),
      "phone_callback"
    );
  });
});

describe("task sorting and search", () => {
  it("sorts open tasks by due date, organization, then creation time", () => {
    const sorted = sortOpenTasks([
      task({ createdAt: "2026-06-25T11:00:00.000Z", id: "b", organizationName: "Beta", dueDate: "2026-07-01" }),
      task({ createdAt: "2026-06-25T09:00:00.000Z", id: "a", organizationName: "Alpha", dueDate: "2026-07-01" }),
      task({ id: "overdue", dueDate: "2026-06-29" }),
      task({ id: "no-date", dueDate: null })
    ]);

    assert.deepEqual(
      sorted.map((row) => row.id),
      ["overdue", "a", "b", "no-date"]
    );
  });

  it("sorts completed tasks by completion time descending", () => {
    const sorted = sortCompletedTasks([
      task({ completedAt: "2026-06-29T10:00:00.000Z", id: "old", status: "completed" }),
      task({ completedAt: "2026-06-30T10:00:00.000Z", id: "new", status: "completed" })
    ]);
    assert.deepEqual(sorted.map((row) => row.id), ["new", "old"]);
  });

  it("search matches title, organization, opportunity, and contact", () => {
    const row = filterable({
      contactLabel: "Laurier Langlois",
      opportunityName: "Graduation fundraising",
      organizationName: "Holy Cross High School",
      title: "First email follow-up"
    });

    assert.equal(taskMatchesSearch(row, "first email"), true);
    assert.equal(taskMatchesSearch(row, "holy cross"), true);
    assert.equal(taskMatchesSearch(row, "fundraising"), true);
    assert.equal(taskMatchesSearch(row, "langlois"), true);
    assert.equal(taskMatchesSearch(row, "unrelated"), false);
  });
});

describe("task date helpers", () => {
  it("computes quick reschedule dates with business-day rules", () => {
    const friday = new Date("2026-06-26T12:00:00.000Z");
    assert.equal(getQuickRescheduleDate("tomorrow", friday), "2026-06-27");
    assert.equal(getQuickRescheduleDate("3bd", friday), "2026-07-01");
    assert.equal(getQuickRescheduleDate("5bd", friday), "2026-07-03");
  });

  it("builds a due_at timestamp only when a time is provided", () => {
    assert.equal(buildDueAtIso("2026-06-30", null), null);
    assert.match(buildDueAtIso("2026-06-30", "09:30") ?? "", /2026-06-30T/);
  });
});
