import { Ellipsis } from "lucide-react";
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  TASK_STATUS_LABELS,
} from "../../features/tasks/constants.js";
import { formatDay, isOverdue } from "../../lib/dates.js";
import { Badge, Dropdown, DropdownItem } from "../ui/index.js";

const TaskRow = ({ task, locked, onToggleDone, onChangeStatus, onDelete }) => {
  const done = task.status === "done";
  // isOverdue only knows projects' "completed". A finished task is never overdue.
  const overdue = !done && isOverdue(task.dueDate, task.status);
  const showPriority = task.priority !== "medium";
  const hasDetails = showPriority || task.dueDate || task.assignee;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={done}
        disabled={locked}
        aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
        onChange={() => {
          onToggleDone(task);
        }}
        className="size-4 shrink-0 accent-brand-600"
      />

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${done ? "text-ink-muted line-through" : "font-medium text-ink"}`}
        >
          {task.title}
        </p>
        {hasDetails && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
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
        )}
      </div>

      <select
        aria-label={`Status of ${task.title}`}
        value={task.status}
        disabled={locked}
        onChange={(event) => {
          onChangeStatus(task, event.target.value);
        }}
        className="w-28 shrink-0 rounded-control border border-line bg-surface px-2 py-1.5 text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
      >
        {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => {
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>

      <Dropdown
        align="right"
        renderTrigger={({ open, toggle, ref }) => {
          return (
            <button
              ref={ref}
              type="button"
              aria-label={`Actions for ${task.title}`}
              aria-expanded={open}
              disabled={locked}
              onClick={toggle}
              className="grid size-8 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-60"
            >
              <Ellipsis className="size-5" aria-hidden="true" />
            </button>
          );
        }}
      >
        {({ close }) => {
          return (
            <DropdownItem
              onClick={() => {
                close();
                onDelete(task);
              }}
            >
              Delete
            </DropdownItem>
          );
        }}
      </Dropdown>
    </li>
  );
};

export default TaskRow;
