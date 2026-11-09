import TaskMeta from "./TaskMeta.jsx";

const TaskCard = ({ task, overlay = false }) => {
  const done = task.status === "done";

  return (
    <div
      className={`rounded-control bg-surface p-3 text-left ring-1 ring-line ${
        overlay ? "cursor-grabbing shadow-pop" : "cursor-grab shadow-card"
      }`}
    >
      <p
        className={`text-sm wrap-break-word ${done ? "text-ink-muted line-through" : "font-medium text-ink"}`}
      >
        {task.title}
      </p>
      <TaskMeta task={task} className="mt-2" />
    </div>
  );
};

export default TaskCard;
