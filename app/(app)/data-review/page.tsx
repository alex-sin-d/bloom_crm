import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function DataReviewPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Data Review"
      description="Minimal review opens and resolves field conflicts, duplicate warnings, unresolved relationships, and import issues."
      sections={["Field conflicts", "Duplicate warnings", "Unresolved relationships", "Import issues"]}
    />
  );
}
