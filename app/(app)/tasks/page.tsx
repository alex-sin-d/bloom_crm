import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function TasksPage() {
  return (
    <PlaceholderPage
      eyebrow="Work"
      title="Tasks"
      description="Task views cover today, overdue, upcoming, completed, approval-related, and research-related work."
      sections={["My tasks", "Today", "Overdue", "Upcoming", "Completed"]}
    />
  );
}
