import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function DataReviewPage() {
  return (
    <PlaceholderPage
      eyebrow="Data issues"
      title="Data Issues to Review"
      description="This future page will let Bloom Boys review field conflicts, duplicate warnings, unresolved relationships, and import issues."
      sections={["Field conflicts", "Duplicate warnings", "Unresolved relationships", "Import issues"]}
    />
  );
}
