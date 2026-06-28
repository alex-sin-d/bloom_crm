import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function TemplatesPage() {
  return (
    <PlaceholderPage
      eyebrow="Tools"
      title="Templates"
      description="Templates are copyable text assets and never send automatically."
      sections={["Create", "Edit", "Duplicate", "Copy", "Archive"]}
    />
  );
}
