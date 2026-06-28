import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function DashboardPage() {
  return (
    <PlaceholderPage
      eyebrow="First slice"
      title="Dashboard"
      description="Actionable work starts here: follow-ups, overdue tasks, recently logged replies, approval waits, 2027 ceremonies, and workload balance."
      sections={[
        "Follow-ups due today",
        "Overdue tasks",
        "Recently logged replies",
        "Tier 1 not contacted",
        "Waiting for approval",
        "Upcoming 2027 ceremonies"
      ]}
    />
  );
}
