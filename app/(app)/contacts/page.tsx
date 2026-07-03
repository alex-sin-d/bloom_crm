import { PageHeader } from "@/components/crm/page-header";
import { ContactsWorkspace } from "@/components/crm/contacts-workspace";
import { requireAuthorizedSession } from "@/lib/auth/session";
import {
  getContactDirectory,
  getContactFormOptions,
  parseContactDirectoryFilters
} from "@/lib/crm/contact-queries";
import Link from "next/link";

type ContactsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  await requireAuthorizedSession();

  const rawParams = await searchParams;
  const filters = parseContactDirectoryFilters(rawParams);
  const [data, formOptions] = await Promise.all([
    getContactDirectory(filters),
    getContactFormOptions()
  ]);

  return (
    <section className="mx-auto max-w-7xl">
      <PageHeader
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-control bg-brand-forest px-4 text-sm font-semibold text-white transition hover:bg-brand-deep"
            href="/contacts?add=1"
          >
            Add contact
          </Link>
        }
        eyebrow="Contacts"
        title="Contacts"
        subtitle="People and departmental contacts connected to outreach, tasks, and CRM history."
      />
      <ContactsWorkspace data={data} formOptions={formOptions} rawParams={rawParams} />
    </section>
  );
}

