import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES } from "../../features/tasks/constants.js";
import { formatDay, isOverdue } from "../../lib/dates.js";
import { Badge } from "../ui/index.js";

const TaskMeta = ({ task, className = "mt-1" }) => {
  const done = task.status === "done";
  // isOverdue only knows projects' "completed". A finished task is never overdue.
  const overdue = !done && isOverdue(task.dueDate, task.status);
  const showPriority = task.priority !== "medium";

  if (!showPriority && !task.dueDate && !task.assignee) {
    return null;
  }

  return (
    <div
      className={`${className} flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted`}
    >
      {showPriority && (
        <Badge tone={TASK_PRIORITY_TONES[task.priority]}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </Badge>
      )}
      {task.dueDate && (
        <span className={overdue ? "font-medium text-clay-700" : undefined}>
          {overdue ? "Overdue · " : "Due "}
          {formatDay(task.dueDate)}
        </span>
      )}
      {task.assignee && <span>{task.assignee.name}</span>}
    </div>
  );
};

export default TaskMeta;
