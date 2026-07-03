import { ContactDetailWorkspace } from "@/components/crm/contacts-workspace";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getContactFormOptions,
  getPersonContactDetail
} from "@/lib/crm/contact-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

type PersonContactPageProps = {
  params: Promise<{ personId: string }>;
};

export default async function PersonContactPage({ params }: PersonContactPageProps) {
  await requireAuthorizedSession();

  const { personId } = await params;
  const [detail, formOptions] = await Promise.all([
    getPersonContactDetail(personId),
    getContactFormOptions()
  ]);

  if (!detail) notFound();

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <Link
        className="inline-flex h-9 items-center rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text-body transition hover:border-border-strong hover:bg-surface-subtle"
        href="/contacts"
      >
        Back to contacts
      </Link>
      <ContactDetailWorkspace detail={detail} formOptions={formOptions} />
    </section>
  );
}

