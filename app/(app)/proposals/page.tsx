import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function ProposalsPage() {
  return (
    <PlaceholderPage
      eyebrow="Tools"
      title="Proposals"
      description="Proposal tracking uses one proposals row per version and proposal_products for product snapshots."
      sections={["Versions", "Status", "Recipient", "Products", "Attachment or link"]}
    />
  );
}
