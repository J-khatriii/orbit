import { Link } from "react-router";
import PortalProgress from "../components/portal/PortalProgress.jsx";
import { Badge, Button, Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { formatDate } from "../features/portal/format.js";
import { usePortalProjects } from "../features/portal/usePortal.js";
import { PROJECT_STATUS_LABELS } from "../features/projects/constants.js";

const PortalPage = () => {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const isClient = activeWorkspace?.role === "client";
  const projects = usePortalProjects(workspaceId, isClient);
  const data = projects.data;

  if (!isClient) {
    return (
      <Card title="Client portal">
        <p className="text-sm text-ink-soft">
          This page is what your clients see. People who work in this workspace use the rest of the
          app.
        </p>
      </Card>
    );
  }

  const renderContent = () => {
    if (projects.isPending) {
      return (
        <div role="status" className="flex justify-center py-16 text-ink-muted">
          <Spinner className="size-6" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (projects.isError) {
      return (
        <Card title="We couldn't load your projects">
          <p className="mb-4 text-sm text-ink-soft">{projects.error.message}</p>
          <Button
            variant="secondary"
            onClick={() => {
              projects.refetch();
            }}
          >
            Try again
          </Button>
        </Card>
      );
    }
    if (data.length === 0) {
      return (
        <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
          <h2 className="font-display text-2xl text-ink">No projects yet.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            When your team shares a project with you, it will appear here.
          </p>
        </div>
      );
    }

    return (
      <ul className="grid gap-4 sm:grid-cols-2">
        {data.map((project) => {
          return (
            <li key={project.id}>
              <Link
                to={`/portal/projects/${project.id}`}
                className="block rounded-card bg-surface p-5 shadow-card ring-1 ring-line transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <p className="text-xs text-ink-muted">{project.clientName}</p>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl wrap-break-word text-ink">{project.name}</h2>
                  <Badge tone="neutral">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                </div>
                <div className="mt-4">
                  <PortalProgress taskCount={project.taskCount} tasksDone={project.tasksDone} />
                </div>
                {project.dueDate && (
                  <p className="mt-3 text-xs text-ink-muted">Due {formatDate(project.dueDate)}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Your projects</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {activeWorkspace?.name ? `With ${activeWorkspace.name}` : "\u00a0"}
        </p>
      </div>
      {renderContent()}
    </div>
  );
};

export default PortalPage;
