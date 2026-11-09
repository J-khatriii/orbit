// A thin bar and a line of text. `compact` keeps the bar short, for use inside table rows.
const TaskProgress = ({ done, total, compact = false, className = "" }) => {
  if (!total) {
    return (
      <p className={`${compact ? "text-xs" : "text-sm"} text-ink-muted ${className}`}>
        No tasks yet
      </p>
    );
  }

  const percent = Math.round((done / total) * 100);

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label="Tasks done"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className={`h-1.5 overflow-hidden rounded-full bg-sunken ${compact ? "max-w-48" : ""}`}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {done} of {total} {total === 1 ? "task" : "tasks"} done
      </p>
    </div>
  );
};

export default TaskProgress;
