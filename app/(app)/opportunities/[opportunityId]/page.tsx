import { PlaceholderPage } from "@/components/ui/placeholder-page";

type OpportunityPageProps = {
  params: Promise<{ opportunityId: string }>;
};

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const { opportunityId } = await params;

  return (
    <PlaceholderPage
      eyebrow="Opportunity"
      title={`Opportunity ${opportunityId}`}
      description="Central working screen with Overview, Outreach, Operations, Proposal, Intelligence, and History sections."
      sections={[
        "Overview",
        "Outreach",
        "Operations",
        "Proposal",
        "Intelligence",
        "History"
      ]}
    />
  );
}
