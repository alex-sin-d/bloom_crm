import { PageHeader } from "@/components/crm/page-header";
import { TasksWorkspace } from "@/components/crm/tasks-workspace";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { getTaskWorkspaceData, parseTaskSearch } from "@/lib/crm/task-queries";

type TasksPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const session = await requireAuthorizedSession();
  const filters = parseTaskSearch(await searchParams);
  const data = await getTaskWorkspaceData(filters, session.profile.id);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Tasks"
        title="Tasks"
        subtitle="Follow-ups and other work for Alex and Sam."
      />
      <TasksWorkspace currentProfile={session.profile} data={data} />
    </section>
  );
}
