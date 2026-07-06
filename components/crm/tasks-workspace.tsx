"use client";

import {
  assignTaskAction,
  completeTaskAction,
  createManualTaskAction,
  rescheduleTaskAction
} from "@/app/(app)/tasks/actions";
import { formatDate, formatDateTime } from "@/lib/crm/format";
import { formatCrmTime, formatCrmTimeInput } from "@/lib/crm/timezone";
import { getQuickRescheduleDate } from "@/lib/crm/task-logic";
import type {
  TaskContactOption,
  TaskFilters,
  TaskListItem,
  TaskOpportunityOption,
  TaskWorkspaceData
} from "@/lib/crm/task-queries";
import type { ProfileSummary } from "@/lib/crm/types";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TasksWorkspaceProps = {
  currentProfile: ProfileSummary;
  data: TaskWorkspaceData;
};

const TASK_TABS: Array<{ label: string; view: TaskFilters["view"] }> = [
  { label: "My tasks", view: "my" },
  { label: "All open", view: "open" },
  { label: "Due today", view: "today" },
  { label: "Overdue", view: "overdue" },
  { label: "Upcoming", view: "upcoming" },
  { label: "Completed", view: "completed" }
];

function buildTasksHref(filters: TaskFilters, updates: Partial<TaskFilters>) {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();
  if (next.view !== "my") params.set("view", next.view);
  if (next.query) params.set("q", next.query);
  if (next.assignedTo) params.set("assignedTo", next.assignedTo);
  if (next.taskType) params.set("taskType", next.taskType);
  if (next.organizationId) params.set("organizationId", next.organizationId);
  if (next.organizationKind !== "all") params.set("organizationKind", next.organizationKind);
  if (next.dueFrom) params.set("dueFrom", next.dueFrom);
  if (next.dueTo) params.set("dueTo", next.dueTo);
  if (next.contact !== "any") params.set("contact", next.contact);
  const query = params.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

function clearFiltersHref(view: TaskFilters["view"]) {
  return view === "my" ? "/tasks" : `/tasks?view=${view}`;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-heading">{value}</p>
    </article>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      viewBox="0 0 24 24"
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fieldClassName() {
  return "h-10 rounded-control border border-border bg-white px-3 text-sm text-text-body";
}

function textareaClassName() {
  return "min-h-20 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-body";
}

function buttonClassName(tone: "primary" | "secondary" = "secondary") {
  return [
    "inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    tone === "primary"
      ? "bg-brand-forest text-white hover:bg-brand-deep"
      : "border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle"
  ].join(" ");
}

function smallButtonClassName(tone: "primary" | "secondary" = "secondary") {
  return [
    "inline-flex h-8 items-center justify-center rounded-control px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    tone === "primary"
      ? "bg-brand-forest text-white hover:bg-brand-deep"
      : "border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle"
  ].join(" ");
}

function ownerLabel(task: TaskListItem) {
  return task.owner ? `Assigned to ${task.owner.displayName}` : "Unassigned";
}

function dueLabel(task: TaskListItem, today: string) {
  const timeLabel = task.dueAt ? ` at ${formatCrmTime(task.dueAt)}` : "";
  if (!task.dueDate) return "No due date";
  if (task.dueDate === today) return `Due today${timeLabel}`;
  if (task.dueDate < today) return `Overdue since ${formatDate(task.dueDate)}${timeLabel}`;
  return `Due ${formatDate(task.dueDate)}${timeLabel}`;
}

function contactTypeLabel(contact: TaskContactOption) {
  return contact.contactType === "named_person" ? "Named person" : "Departmental contact";
}

function timeFromDueAt(dueAt: string | null) {
  return formatCrmTimeInput(dueAt);
}

function FilterPanel({ data }: { data: TaskWorkspaceData }) {
  const [open, setOpen] = useState(false);
  const filters = data.filters;

  return (
    <section className="rounded-card border border-border bg-surface shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Task list</h2>
          <p className="mt-1 text-sm text-text-muted">
            {data.totalVisibleTasks} {data.totalVisibleTasks === 1 ? "task" : "tasks"} shown
          </p>
        </div>
        <button className={buttonClassName()} type="button" onClick={() => setOpen((value) => !value)}>
          Filters
        </button>
      </div>

      {open ? (
        <form action="/tasks" className="border-t border-border px-4 py-4" method="get">
          <input name="view" type="hidden" value={filters.view} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Search
              <input
                className={fieldClassName()}
                defaultValue={filters.query}
                name="q"
                placeholder="Task, school, contact"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Assigned to
              <select className={fieldClassName()} defaultValue={filters.assignedTo} name="assignedTo">
                <option value="">Anyone</option>
                <option value="me">Me</option>
                <option value="unassigned">Unassigned</option>
                {data.ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Task type
              <select className={fieldClassName()} defaultValue={filters.taskType} name="taskType">
                <option value="">Any type</option>
                {data.taskTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Organization
              <select
                className={fieldClassName()}
                defaultValue={filters.organizationId}
                name="organizationId"
              >
                <option value="">Any organization</option>
                {data.organizationOptions.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              School type
              <select
                className={fieldClassName()}
                defaultValue={filters.organizationKind}
                name="organizationKind"
              >
                <option value="all">Any organization</option>
                <option value="school_division">School division</option>
                <option value="school">High school</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Due from
              <input className={fieldClassName()} defaultValue={filters.dueFrom} name="dueFrom" type="date" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Due to
              <input className={fieldClassName()} defaultValue={filters.dueTo} name="dueTo" type="date" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-body">
              Contact
              <select className={fieldClassName()} defaultValue={filters.contact} name="contact">
                <option value="any">Any contact state</option>
                <option value="with">Has contact</option>
                <option value="without">No contact linked</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className={buttonClassName("primary")} type="submit">
              Apply
            </button>
            <Link className={buttonClassName()} href={clearFiltersHref(filters.view)}>
              Clear
            </Link>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function AddTaskPanel({
  currentProfile,
  data,
  open,
  onClose
}: {
  currentProfile: ProfileSummary;
  data: TaskWorkspaceData;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");

  const opportunityOptions = useMemo(
    () => filterOpportunityOptions(data.opportunityOptions, organizationId),
    [data.opportunityOptions, organizationId]
  );
  const selectedOpportunityId = opportunityOptions.some((option) => option.id === opportunityId)
    ? opportunityId
    : "";
  const contactOptions = useMemo(
    () => filterContactOptions(data.contactOptions, organizationId, selectedOpportunityId),
    [data.contactOptions, selectedOpportunityId, organizationId]
  );

  if (!open) return null;

  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Add task</h2>
          <p className="mt-1 text-sm text-text-muted">Manual task</p>
        </div>
        <button className={smallButtonClassName()} type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await createManualTaskAction({
              assignedUserId: cleanFormValue(form.get("assignedUserId")),
              contactRoleId: cleanFormValue(form.get("contactRoleId")),
              dueDate: cleanFormValue(form.get("dueDate")) ?? "",
              dueTime: cleanFormValue(form.get("dueTime")),
              note: cleanFormValue(form.get("note")),
              opportunityId: cleanFormValue(form.get("opportunityId")),
              organizationId: cleanFormValue(form.get("organizationId")),
              title: cleanFormValue(form.get("title")) ?? ""
            });
            if ("error" in result) {
              setError(result.error);
              return;
            }
            onClose();
            router.refresh();
          });
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Task title
            <input className={fieldClassName()} name="title" required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Assigned owner
            <select className={fieldClassName()} defaultValue="" name="assignedUserId">
              <option value="">Unassigned</option>
              <option value={currentProfile.id}>Me ({currentProfile.displayName})</option>
              {data.ownerOptions
                .filter((owner) => owner.id !== currentProfile.id)
                .map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.displayName}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due date
            <input className={fieldClassName()} name="dueDate" required type="date" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Due time
            <input className={fieldClassName()} name="dueTime" type="time" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Organization
            <select
              className={fieldClassName()}
              name="organizationId"
              onChange={(event) => {
                setOrganizationId(event.target.value);
                setOpportunityId("");
              }}
              value={organizationId}
            >
              <option value="">No organization</option>
              {data.organizationOptions.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body">
            Opportunity
            <select
              className={fieldClassName()}
              name="opportunityId"
              onChange={(event) => setOpportunityId(event.target.value)}
              value={selectedOpportunityId}
            >
              <option value="">No opportunity</option>
              {opportunityOptions.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Contact
            <select className={fieldClassName()} name="contactRoleId">
              <option value="">No contact linked</option>
              {contactOptions.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.label} - {contactTypeLabel(contact)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-text-body md:col-span-2">
            Note
            <textarea className={textareaClassName()} name="note" />
          </label>
        </div>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <button className={buttonClassName("primary")} disabled={pending} type="submit">
            {pending ? "Adding..." : "Add task"}
          </button>
          <button className={buttonClassName()} disabled={pending} onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function cleanFormValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function filterOpportunityOptions(options: TaskOpportunityOption[], organizationId: string) {
  if (!organizationId) return options;
  return options.filter(
    (opportunity) =>
      opportunity.organizationId === organizationId ||
      opportunity.parentOrganizationId === organizationId
  );
}

function filterContactOptions(
  options: TaskContactOption[],
  organizationId: string,
  opportunityId: string
) {
  return options.filter((contact) => {
    if (opportunityId && contact.opportunityId && contact.opportunityId !== opportunityId) {
      return false;
    }
    if (organizationId && contact.organizationId && contact.organizationId !== organizationId) {
      return false;
    }
    if (organizationId) {
      return contact.organizationId === organizationId || contact.opportunityId === opportunityId;
    }
    return true;
  });
}

function RescheduleControl({ task }: { task: TaskListItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(timeFromDueAt(task.dueAt));

  const save = (newDueDate = dueDate, newDueTime = dueTime) => {
    if (!newDueDate) {
      setError("Choose a due date.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rescheduleTaskAction({
        dueDate: newDueDate,
        dueTime: newDueTime || null,
        taskId: task.id
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <button className={smallButtonClassName()} type="button" onClick={() => setOpen((value) => !value)}>
        Reschedule
      </button>
      {open ? (
        <div className="rounded-control border border-border bg-surface-subtle p-3">
          <p className="text-xs font-semibold uppercase text-text-muted">
            Current due date: {formatDate(task.dueDate)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={smallButtonClassName()}
              disabled={pending}
              onClick={() => save(getQuickRescheduleDate("tomorrow"), dueTime)}
              type="button"
            >
              Tomorrow
            </button>
            <button
              className={smallButtonClassName()}
              disabled={pending}
              onClick={() => save(getQuickRescheduleDate("3bd"), dueTime)}
              type="button"
            >
              In 3 business days
            </button>
            <button
              className={smallButtonClassName()}
              disabled={pending}
              onClick={() => save(getQuickRescheduleDate("5bd"), dueTime)}
              type="button"
            >
              In 5 business days
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_0.7fr_auto]">
            <input
              className={fieldClassName()}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
            <input
              className={fieldClassName()}
              onChange={(event) => setDueTime(event.target.value)}
              type="time"
              value={dueTime}
            />
            <button className={smallButtonClassName("primary")} disabled={pending} onClick={() => save()} type="button">
              Save
            </button>
          </div>
          {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function TaskRow({
  currentProfile,
  ownerOptions,
  task,
  today
}: {
  currentProfile: ProfileSummary;
  ownerOptions: ProfileSummary[];
  task: TaskListItem;
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isCompleted = task.status === "completed";
  const isOpen = !isCompleted && task.status !== "cancelled";

  const complete = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeTaskAction(task.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const assign = (assignedUserId: string | null) => {
    setError(null);
    startTransition(async () => {
      const result = await assignTaskAction({ assignedUserId, taskId: task.id });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <li className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            {isOpen ? (
              <button
                aria-label={`Complete ${task.title}`}
                className={[
                  "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition",
                  pending
                    ? "border-border bg-surface-subtle"
                    : "border-border bg-white hover:border-brand-forest"
                ].join(" ")}
                disabled={pending}
                onClick={complete}
                type="button"
              />
            ) : (
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-brand-forest bg-brand-forest text-white">
                <CheckIcon />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-text-heading">{task.title}</p>
              <p className="mt-1 text-sm text-text-muted">
                {task.organization?.name ?? "General task"}
                {task.contact ? ` - ${task.contact.label}` : ""}
              </p>
              <p className="mt-2 text-sm text-text-body">
                {dueLabel(task, today)} - {ownerLabel(task)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
                <span className="rounded-chip border border-border bg-surface-subtle px-2 py-1">
                  {task.taskTypeLabel}
                </span>
                {task.opportunity ? (
                  <span className="rounded-chip border border-border bg-surface-subtle px-2 py-1">
                    {task.opportunity.statusLabel}
                  </span>
                ) : null}
                {task.contact ? (
                  <span className="rounded-chip border border-border bg-surface-subtle px-2 py-1">
                    {contactTypeLabel(task.contact)}
                  </span>
                ) : null}
              </div>
              {task.contact?.email || task.contact?.phone ? (
                <p className="mt-2 text-sm text-text-muted">
                  {[task.contact.email, task.contact.phone].filter(Boolean).join(" - ")}
                </p>
              ) : null}
              {task.notes || task.details ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
                  {task.notes ?? task.details}
                </p>
              ) : null}
              {isCompleted ? (
                <details className="mt-3 text-sm text-text-muted">
                  <summary className="cursor-pointer font-semibold text-text-body">View details</summary>
                  <p className="mt-2">
                    Completed {formatDateTime(task.completedAt)}. Created {formatDateTime(task.createdAt)}.
                  </p>
                </details>
              ) : null}
              {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row lg:w-64 lg:flex-col">
          {isOpen ? (
            <>
              <select
                aria-label={`Assign ${task.title}`}
                className={fieldClassName()}
                disabled={pending}
                onChange={(event) => assign(event.target.value || null)}
                value={task.assignedUserId ?? ""}
              >
                <option value="">Unassigned</option>
                {ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.displayName}
                  </option>
                ))}
              </select>
              {!task.assignedUserId ? (
                <button
                  className={smallButtonClassName("primary")}
                  disabled={pending}
                  onClick={() => assign(currentProfile.id)}
                  type="button"
                >
                  Assign to me
                </button>
              ) : null}
              <RescheduleControl task={task} />
            </>
          ) : null}
          {task.workspaceHref ? (
            <Link className={smallButtonClassName()} href={task.workspaceHref}>
              {task.workspaceLabel ?? "Open related workspace"}
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function EmptyState({ data }: { data: TaskWorkspaceData }) {
  const view = data.filters.view;
  if (view === "my" && !data.hasAssignedTasks) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-sm text-text-muted shadow-soft">
        <p>You do not have any assigned tasks. View all open tasks or claim an unassigned task.</p>
        <Link className="mt-3 inline-flex text-sm font-semibold text-brand-forest" href="/tasks?view=open">
          View all open tasks
        </Link>
      </div>
    );
  }

  const message =
    view === "today"
      ? "Nothing is due today."
      : view === "overdue"
        ? "No overdue tasks."
        : view === "completed"
          ? "No completed tasks yet."
          : data.totalVisibleTasks === 0 && hasFilters(data.filters)
            ? "No tasks match these filters."
            : "No open tasks.";

  return (
    <div className="rounded-card border border-border bg-surface p-6 text-sm text-text-muted shadow-soft">
      {message}
    </div>
  );
}

function hasFilters(filters: TaskFilters) {
  return Boolean(
    filters.query ||
      filters.assignedTo ||
      filters.taskType ||
      filters.organizationId ||
      filters.organizationKind !== "all" ||
      filters.dueFrom ||
      filters.dueTo ||
      filters.contact !== "any"
  );
}

export function TasksWorkspace({ currentProfile, data }: TasksWorkspaceProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Due today" value={data.summary.dueToday} />
        <SummaryCard label="Overdue" value={data.summary.overdue} />
        <SummaryCard label="Upcoming" value={data.summary.upcoming} />
        <SummaryCard label="Unassigned" value={data.summary.unassigned} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Task views">
          {TASK_TABS.map((tab) => {
            const active = data.filters.view === tab.view;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex h-9 items-center rounded-control border px-3 text-sm font-semibold transition",
                  active
                    ? "border-brand-forest bg-surface-subtle text-brand-forest"
                    : "border-border bg-surface text-text-body hover:border-border-strong"
                ].join(" ")}
                href={buildTasksHref(data.filters, { view: tab.view })}
                key={tab.view}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <button className={buttonClassName("primary")} type="button" onClick={() => setAddOpen(true)}>
          Add task
        </button>
      </div>

      <AddTaskPanel
        currentProfile={currentProfile}
        data={data}
        onClose={() => setAddOpen(false)}
        open={addOpen}
      />

      <FilterPanel data={data} />

      {data.groups.length === 0 ? (
        <EmptyState data={data} />
      ) : (
        <div className="space-y-5">
          {data.groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-2 text-sm font-semibold uppercase text-text-muted">{group.label}</h2>
              <ul className="space-y-3">
                {group.tasks.map((task) => (
                  <TaskRow
                    currentProfile={currentProfile}
                    key={task.id}
                    ownerOptions={data.ownerOptions}
                    task={task}
                    today={data.today}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
