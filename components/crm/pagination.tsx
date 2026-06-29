import Link from "next/link";

function pageHref(basePath: string, params: URLSearchParams, page: number) {
  const nextParams = new URLSearchParams(params);
  nextParams.set("page", String(page));
  return `${basePath}?${nextParams.toString()}`;
}

export function Pagination({
  basePath,
  count,
  page,
  pageSize,
  params
}: {
  basePath: string;
  count: number;
  page: number;
  pageSize: number;
  params: URLSearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const firstItem = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, count);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing {firstItem}-{lastItem} of {count}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            className="rounded-control border border-border bg-surface px-3 py-2 font-medium text-text-body"
            href={pageHref(basePath, params, page - 1)}
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-control border border-border bg-surface-subtle px-3 py-2 text-text-muted">
            Previous
          </span>
        )}
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            className="rounded-control border border-border bg-surface px-3 py-2 font-medium text-text-body"
            href={pageHref(basePath, params, page + 1)}
          >
            Next
          </Link>
        ) : (
          <span className="rounded-control border border-border bg-surface-subtle px-3 py-2 text-text-muted">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
