import { formatEnumLabel } from "@/lib/crm/format";
import type { ReactNode } from "react";

const toneClass = {
  danger: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-gray-200 bg-gray-50 text-gray-700",
  primary: "border-emerald-200 bg-emerald-50 text-emerald-800",
  review: "border-purple-200 bg-purple-50 text-purple-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800"
} as const;

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span
      className={[
        "inline-flex min-h-6 items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold leading-4",
        toneClass[tone]
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function EnumBadge({
  tone,
  value
}: {
  tone?: keyof typeof toneClass;
  value: string | null | undefined;
}) {
  return <StatusBadge tone={tone}>{formatEnumLabel(value)}</StatusBadge>;
}
