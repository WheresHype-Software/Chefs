"use client";

import { moderateReview } from "@/app/admin/actions";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";

/** Keep, hide or delete a reported review. */
export function ReviewModeration({ reviewId, reportId }: { reviewId: string; reportId: string }) {
  const { run, pending, message } = useServerAction(moderateReview);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => run(reviewId, reportId, "keep")}>
          Manter
        </button>
        <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => run(reviewId, reportId, "hide")}>
          Esconder
        </button>
        <button
          type="button"
          className="btn btn-sm btn-o !border-line-2 !text-danger"
          disabled={pending}
          onClick={() => confirm("Apagar a avaliação?") && run(reviewId, reportId, "delete")}
        >
          Apagar
        </button>
      </div>
      <FormMessage message={message} />
    </div>
  );
}
