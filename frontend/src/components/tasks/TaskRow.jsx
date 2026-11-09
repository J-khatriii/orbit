import { Ellipsis } from "lucide-react";
import TaskMeta from "./TaskMeta.jsx";
import { TASK_STATUS_LABELS } from "../../features/tasks/constants.js";
import { Dropdown, DropdownItem } from "../ui/index.js";

const TaskRow = ({ task, locked, onToggleDone, onChangeStatus, onDelete }) => {
  const done = task.status === "done";

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
        <TaskMeta task={task} />
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
