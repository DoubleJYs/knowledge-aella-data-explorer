import type { ReviewStatus } from "~/types/knowledge";
import { cn } from "~/ui";
import { getStatusLabel } from "./status";

const statusTone: Record<ReviewStatus, string> = {
  approved: "border-green-200 bg-green-50 text-green-700",
  ai_analyzing: "border-sky-200 bg-sky-50 text-sky-700",
  ai_analysis_failed: "border-red-200 bg-red-50 text-red-700",
  draft: "border-gray-200 bg-gray-50 text-gray-600",
  pending_review: "border-yellow-200 bg-yellow-50 text-yellow-800",
  published: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  reviewing: "border-blue-200 bg-blue-50 text-blue-700",
  uploaded: "border-gray-200 bg-gray-50 text-gray-600",
};

export function StatusBadge({
  className,
  status,
}: {
  className?: string;
  status: ReviewStatus;
}) {
  return (
    <span
      className={cn(
        `
          inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs
          font-medium
        `,
        statusTone[status],
        className,
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
