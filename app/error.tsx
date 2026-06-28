"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function RootError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState title="Something went wrong" message={error.message} onRetry={reset} />;
}
