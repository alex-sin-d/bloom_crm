import { PlaceholderPage } from "@/components/ui/placeholder-page";

type ReviewItemPageProps = {
  params: Promise<{ reviewItemId: string }>;
};

export default async function ReviewItemPage({ params }: ReviewItemPageProps) {
  const { reviewItemId } = await params;

  return (
    <PlaceholderPage
      eyebrow="Data Review"
      title={`Review item ${reviewItemId}`}
      description="Review item detail will show the issue, supporting source data, recommendation, and explicit decision controls."
      sections={["Issue", "Source evidence", "Recommendation", "Decision", "Audit"]}
    />
  );
}
