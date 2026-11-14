import { useState } from "react";
import { Button, useToast } from "../ui/index.js";
import { fieldErrorsOf } from "../../lib/api.js";
import { useReviewTask } from "../../features/portal/usePortalMutations.js";

const PortalTaskReview = ({ workspaceId, taskId }) => {
  const toast = useToast();
  const review = useReviewTask();
  // null = just the two buttons, "approve" = asking to confirm, "changes" = writing a comment.
  const [mode, setMode] = useState(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const cancel = () => {
    setMode(null);
    setComment("");
    setError("");
  };

  const submit = (decision) => {
    const text = comment.trim();

    if (decision === "changes_requested" && !text) {
      setError("Say what should change");
      return;
    }

    setError("");
    review.mutate(
      {
        workspaceId,
        taskId,
        input: decision === "approved" ? { decision } : { decision, comment: text },
      },
      {
        onSuccess: () => {
          toast.show(
            decision === "approved" ? "Approved. Thank you!" : "Your request was sent to the team.",
          );
        },
        onError: (reviewError) => {
          if (reviewError.code === "TASK_NOT_IN_REVIEW") {
            toast.show(reviewError.message);
          } else {
            setError(fieldErrorsOf(reviewError).comment ?? reviewError.message);
          }
        },
      },
    );
  };

  return (
    <div className="mt-3 rounded-control bg-sunken px-3 py-3">
      <p className="text-sm font-medium text-ink">Needs your review</p>

      {mode === null && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setMode("approve");
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setMode("changes");
            }}
          >
            Request changes
          </Button>
        </div>
      )}

      {mode === "approve" && (
        <div className="mt-2">
          <p className="text-sm text-ink-soft">Approve this task? It will be marked as done.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={review.isPending}
              onClick={() => {
                submit("approved");
              }}
            >
              Yes, approve
            </Button>
          </div>
        </div>
      )}

      {mode === "changes" && (
        <div className="mt-2">
          <label htmlFor={`review-comment-${taskId}`} className="sr-only">
            What should change?
          </label>
          <textarea
            id={`review-comment-${taskId}`}
            rows={3}
            maxLength={2000}
            placeholder="What should change?"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
            }}
            className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={review.isPending}
              onClick={() => {
                submit("changes_requested");
              }}
            >
              Send request
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-clay-600">{error}</p>}
    </div>
  );
};

export default PortalTaskReview;
