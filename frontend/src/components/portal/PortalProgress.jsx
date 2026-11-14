const PortalProgress = ({ taskCount, tasksDone }) => {
  if (taskCount === 0) {
    return <p className="text-xs text-ink-muted">No tasks shared yet</p>;
  }

  const percent = Math.round((tasksDone / taskCount) * 100);

  return (
    <div>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {tasksDone} of {taskCount} tasks done
      </p>
    </div>
  );
};

export default PortalProgress;
