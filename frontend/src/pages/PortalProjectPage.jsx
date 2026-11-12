import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import PortalProgress from "../components/portal/PortalProgress.jsx";
import { Badge, Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { formatDate } from "../features/portal/format.js";
import { usePortalProject } from "../features/portal/usePortal.js";
import { PROJECT_STATUS_LABELS } from "../features/projects/constants.js";
import { TASK_STATUS_LABELS } from "../features/tasks/constants.js";

const STATUS_ORDER = ["todo", "in_progress", "in_review", "done"];

const PortalProjectPage = () => {
  const { projectId } = useParams();
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const isClient = activeWorkspace?.role === "client";
  const query = usePortalProject(workspaceId, projectId, isClient);

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

  if (query.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (query.isError) {
    const missing = query.error.code === "PROJECT_NOT_FOUND";

    return (
      <Card title={missing ? "We couldn't find this project" : "We couldn't load this project"}>
        <p className="mb-4 text-sm text-ink-soft">
          {missing ? "It may have been removed, or the link is wrong." : query.error.message}
        </p>
        <Link to="/portal" className="text-sm font-medium text-brand-700 hover:underline">
          Back to your projects
        </Link>
      </Card>
    );
  }

  const { project, tasks } = query.data;
  const groups = STATUS_ORDER.map((status) => {
    return {
      status,
      tasks: tasks.filter((task) => {
        return task.status === status;
      }),
    };
  }).filter((group) => {
    return group.tasks.length > 0;
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        to="/portal"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All projects
      </Link>

      <header>
        <p className="text-sm text-ink-muted">{project.clientName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl wrap-break-word text-ink">{project.name}</h1>
          <Badge tone="neutral">{PROJECT_STATUS_LABELS[project.status]}</Badge>
        </div>
        {(project.startDate || project.dueDate) && (
          <p className="mt-2 text-sm text-ink-soft">
            {project.startDate && `Started ${formatDate(project.startDate)}`}
            {project.startDate && project.dueDate && " · "}
            {project.dueDate && `Due ${formatDate(project.dueDate)}`}
          </p>
        )}
        <div className="mt-4 max-w-sm">
          <PortalProgress taskCount={project.taskCount} tasksDone={project.tasksDone} />
        </div>
      </header>

      {groups.length === 0 && (
        <Card title="Tasks">
          <p className="text-sm text-ink-soft">
            Nothing to show yet. Your team hasn&apos;t shared any tasks for this project.
          </p>
        </Card>
      )}

      {groups.map((group) => {
        return (
          <Card
            key={group.status}
            title={`${TASK_STATUS_LABELS[group.status]} (${group.tasks.length})`}
          >
            <ul className="divide-y divide-line">
              {group.tasks.map((task) => {
                return (
                  <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-ink">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 text-sm whitespace-pre-wrap text-ink-soft">
                        {task.description}
                      </p>
                    )}
                    {task.dueDate && (
                      <p className="mt-1 text-xs text-ink-muted">Due {formatDate(task.dueDate)}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
};

export default PortalProjectPage;
