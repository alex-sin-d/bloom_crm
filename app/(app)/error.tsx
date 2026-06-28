"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState title="Workspace error" message={error.message} onRetry={reset} />;
}
