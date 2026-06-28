import { PlaceholderPage } from "@/components/ui/placeholder-page";

type ContactPageProps = {
  params: Promise<{ contactId: string }>;
};

export default async function ContactPage({ params }: ContactPageProps) {
  const { contactId } = await params;

  return (
    <PlaceholderPage
      eyebrow="Contact"
      title={`Contact ${contactId}`}
      description="Basic contact detail keeps named people and departmental contacts visually separate."
      sections={["Identity", "Roles", "Methods", "Related opportunities", "Communication history"]}
    />
  );
}
