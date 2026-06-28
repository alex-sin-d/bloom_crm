import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Settings"
      description="Settings will manage profile preferences, products, partnership presets, saved views, and archived records."
      sections={["Profiles", "Products", "Partnership presets", "Saved views", "Archived records"]}
    />
  );
}
