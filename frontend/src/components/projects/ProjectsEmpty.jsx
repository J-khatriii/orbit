import { Columns3 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../ui/index.js";

// Three situations, three messages:
//   filtered    you searched or filtered and nothing matched
//   noClients   there's nobody to attach a project to yet
//   otherwise   this workspace has no projects yet (`action` is an optional button)
const ProjectsEmpty = ({ filtered, noClients, onClear, action }) => {
  const renderContent = () => {
    if (filtered) {
      return (
        <>
          <h2 className="font-display text-2xl text-ink">No projects match.</h2>
          <p className="text-sm text-ink-soft">
            Try a different search, or clear the filters to see everything.
          </p>
          <Button variant="secondary" onClick={onClear}>
            Clear filters
          </Button>
        </>
      );
    }
    if (noClients) {
      return (
        <>
          <h2 className="font-display text-2xl text-ink">Start with a client.</h2>
          <p className="text-sm text-ink-soft">
            Every project belongs to a client, so add one first.
          </p>
          <Link to="/clients" className="text-sm font-medium text-brand-700 hover:underline">
            Go to clients
          </Link>
        </>
      );
    }

    return (
      <>
        <h2 className="font-display text-2xl text-ink">Your first project goes here.</h2>
        <p className="text-sm text-ink-soft">
          Projects are the work you do for a client, with a team, dates and a budget. Tasks and
          files will live inside them.
        </p>
        {action}
      </>
    );
  };

  return (
    <div className="grid place-items-center rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-sunken text-ink-muted">
          <Columns3 className="size-6" aria-hidden="true" />
        </span>
        {renderContent()}
      </div>
    </div>
  );
};

export default ProjectsEmpty;
