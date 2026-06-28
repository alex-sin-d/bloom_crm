import { PlaceholderPage } from "@/components/ui/placeholder-page";

type OrganizationPageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const { organizationId } = await params;

  return (
    <PlaceholderPage
      eyebrow="Organization"
      title={`Organization ${organizationId}`}
      description="Basic organization detail will show hierarchy, related contacts, events, opportunities, policies, gaps, and source evidence."
      sections={["Overview", "Hierarchy", "Contacts", "Events", "Sources"]}
    />
  );
}
