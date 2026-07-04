"use client";

import { addToPipelineAction } from "@/app/(app)/research/opportunities/actions";
import { useState } from "react";
import { useFormStatus } from "react-dom";

function SubmitActivationButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-10 rounded-control bg-brand-forest px-4 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
      disabled={!enabled || pending}
      type="submit"
    >
      {pending ? "Starting..." : "Start active outreach"}
    </button>
  );
}

export function AddToPipelineConfirmation({
  activeOwners,
  opportunityId,
  selectedOwnerId,
  returnTo
}: {
  activeOwners: Array<{
    displayName: string;
    id: string;
  }>;
  opportunityId: string;
  selectedOwnerId: string | null;
  returnTo: string;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form action={addToPipelineAction} className="space-y-3">
      <input name="opportunityId" type="hidden" value={opportunityId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="block">
        <span className="text-xs font-semibold uppercase text-text-muted">Assign an owner</span>
        <select
          className="mt-1 h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text-body"
          defaultValue={selectedOwnerId ?? ""}
          name="assignedOwnerId"
        >
          <option value="">Unassigned</option>
          {activeOwners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex gap-3 rounded-control border border-border bg-surface-subtle p-3 text-sm leading-6 text-text-body">
        <input
          className="mt-1 h-4 w-4 accent-brand-forest"
          name="confirmActivation"
          onChange={(event) => setConfirmed(event.target.checked)}
          required
          type="checkbox"
          value="confirmed"
        />
        <span>
          I understand this starts active outreach for this opportunity. Previewing, filtering,
          and opening this research did not make changes.
        </span>
      </label>
      <SubmitActivationButton enabled={confirmed} />
    </form>
  );
}
