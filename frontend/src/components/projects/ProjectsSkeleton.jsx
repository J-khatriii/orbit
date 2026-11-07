// Grey placeholder rows shown while the first page loads.
const ProjectsSkeleton = () => {
  return (
    <div
      role="status"
      aria-label="Loading projects"
      className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"
    >
      <ul className="divide-y divide-line">
        {[0, 1, 2, 3, 4, 5].map((row) => {
          return (
            <li key={row} className="flex animate-pulse items-center gap-4 px-4 py-4">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-sunken" />
                <div className="h-3 w-1/4 rounded bg-sunken" />
              </div>
              <div className="h-5 w-16 rounded-full bg-sunken" />
              <div className="hidden h-3 w-24 rounded bg-sunken md:block" />
            </li>
          );
        })}
      </ul>
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default ProjectsSkeleton;
