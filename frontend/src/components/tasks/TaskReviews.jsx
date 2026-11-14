import { Badge } from "../ui/index.js";
import { useTaskReviews } from "../../features/tasks/useTaskReviews.js";
import { timeAgo } from "../../lib/timeAgo.js";

const DECISIONS = {
  approved: { label: "Approved", tone: "sage" },
  changes_requested: { label: "Changes requested", tone: "clay" },
};

// What the client decided on this task, newest first. Shows nothing until there's a decision.
const TaskReviews = ({ workspaceId, projectId, taskId }) => {
  const reviews = useTaskReviews(workspaceId, projectId, taskId);
  const list = reviews.data ?? [];

  if (list.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-ink">Client decisions</h3>
      <ul className="space-y-2">
        {list.map((review) => {
          const decision = DECISIONS[review.decision];

          return (
            <li key={review.id} className="rounded-control bg-sunken px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={decision.tone}>{decision.label}</Badge>
                <span className="text-xs text-ink-muted">
                  {review.reviewerName ?? "A client"} · {timeAgo(review.createdAt)}
                </span>
              </div>
              {review.comment && (
                <p className="mt-1.5 text-sm warp-break-word whitespace-pre-wrap text-ink">
                  {review.comment}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TaskReviews;
