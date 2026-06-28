import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function ResearchOpportunitiesPage() {
  return (
    <PlaceholderPage
      eyebrow="Research"
      title="Opportunities"
      description="Research stays outside the active pipeline until Alex or Sam explicitly uses Add to pipeline."
      sections={[
        "Search and required filters",
        "Saved views",
        "Preview drawer",
        "Source evidence",
        "Add to pipeline wizard"
      ]}
    />
  );
}
