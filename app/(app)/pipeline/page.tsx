import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function PipelinePage() {
  return (
    <PlaceholderPage
      eyebrow="Pipeline"
      title="Active opportunities"
      description="Pipeline table comes first. Stage changes remain manual and require confirmation."
      sections={["Table view", "Kanban structure", "Owner filter", "Manual stage change", "Overdue follow-up"]}
    />
  );
}
