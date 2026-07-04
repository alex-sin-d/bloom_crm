import { PageHeader } from "@/components/crm/page-header";
import { requireAuthorizedSession } from "@/lib/auth/session";
import { devToolsEnabled } from "@/lib/config/feature-visibility";
import Link from "next/link";

// This hub is intentionally static: it renders links and labels only, never
// queries a module, so it stays safe even when a linked tool is broken.

type AdminToolLink = {
  description: string;
  href: string;
  label: string;
};

const businessTools: AdminToolLink[] = [
  {
    description: "Imported data questions that need a human decision.",
    href: "/data-review",
    label: "Data Issues to Review"
  },
  {
    description: "Churches, universities, partners, and other organizations.",
    href: "/organizations",
    label: "Organizations"
  },
  {
    description: "The full history of changes and outreach across the CRM.",
    href: "/activity",
    label: "Activity"
  },
  {
    description: "All people and departmental contacts in one directory.",
    href: "/contacts",
    label: "Contacts Directory"
  }
];

const developmentTools: AdminToolLink[] = [
  {
    description: "Event planning workspace. Still in development.",
    href: "/events",
    label: "Events"
  },
  {
    description: "Not available yet.",
    href: "/proposals",
    label: "Proposals"
  },
  {
    description: "Not available yet.",
    href: "/templates",
    label: "Templates"
  },
  {
    description: "Not available yet.",
    href: "/settings",
    label: "Settings"
  }
];

function ToolCard({ badge, tool }: { badge?: string; tool: AdminToolLink }) {
  return (
    <Link
      className="rounded-card border border-border bg-surface p-4 shadow-soft transition hover:border-border-strong"
      href={tool.href}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-text-heading">{tool.label}</p>
        {badge ? (
          <span className="shrink-0 rounded-[4px] border border-border bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-text-muted">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-text-muted">{tool.description}</p>
    </Link>
  );
}

export default async function AdminToolsPage() {
  await requireAuthorizedSession();
  const showDevelopmentTools = devToolsEnabled();

  return (
    <section className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Administration"
        title="Admin Tools"
        subtitle="Occasional tools that support outreach but are not part of the daily workflow."
      />
      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-text-heading">Business administration</h2>
          <p className="mt-1 text-sm text-text-muted">
            Available to both owners. Useful occasionally, not needed every day.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {businessTools.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </section>

        {showDevelopmentTools ? (
          <section>
            <h2 className="text-base font-semibold text-text-heading">Development tools</h2>
            <p className="mt-1 text-sm text-text-muted">
              Unfinished areas. These may be incomplete or temporarily unavailable.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {developmentTools.map((tool) => (
                <ToolCard badge="Development" key={tool.href} tool={tool} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
