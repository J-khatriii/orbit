import { Link } from "react-router";
import TaskMeta from "./TaskMeta.jsx";

const MyTaskRow = ({ task, busy, onToggleDone }) => {
  const done = task.status === "done";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={done}
        disabled={busy}
        aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
        onChange={() => {
          onToggleDone(task);
        }}
        className="size-4 shrink-0 accent-brand-600"
      />
      <div className="min-w-0 flex-1">
        {/* Opens the project's Tasks tab with this task's drawer. */}
        <Link
          to={`/projects/${task.projectId}?tab=tasks&task=${task.id}`}
          className={`block truncate text-sm hover:underline ${
            done ? "text-ink-muted line-through" : "font-medium text-ink"
          }`}
        >
          {task.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {task.projectName} · {task.clientName}
        </p>
        <TaskMeta task={task} showAssignee={false} />
      </div>
    </li>
  );
};

export default MyTaskRow;
