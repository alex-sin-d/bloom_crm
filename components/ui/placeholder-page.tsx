export function PlaceholderPage({
  description,
  eyebrow,
  sections,
  title
}: {
  description: string;
  eyebrow: string;
  sections: string[];
  title: string;
}) {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand-forest">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-text-heading">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted">{description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <article
            className="min-h-28 rounded-card border border-border bg-surface p-4 shadow-soft"
            key={section}
          >
            <h2 className="text-base font-semibold text-text-heading">{section}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">Ready for controlled implementation.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
