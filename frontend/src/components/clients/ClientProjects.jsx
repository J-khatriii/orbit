import { useState } from "react";
import ProjectFormModal from "../projects/ProjectFormModal.jsx";
import { Badge, Button, Card, Spinner } from "../ui/index.js";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES } from "../../features/projects/constants.js";
import { useProjects } from "../../features/projects/useProjects.js";
import { formatDay, isOverdue } from "../../lib/dates.js";
import { Link } from "react-router";

// Up to this many of the client's projects, soonest due first (projects without a due
// date last).
const FILTERS = { view: "active", sort: "due", order: "asc", page: 1, pageSize: 100 };

const ClientProjects = ({ workspaceId, client }) => {
  const projects = useProjects(workspaceId, { ...FILTERS, clientId: client.id });
  const [adding, setAdding] = useState(false);

  const renderBody = () => {
    if (projects.isPending) {
      return (
        <div role="status" className="flex justify-center py-6 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (projects.isError) {
      return <p className="text-sm text-clay-700">{projects.error.message}</p>;
    }
    if (projects.data.projects.length === 0) {
      return (
        <p className="text-sm text-ink-soft">
          No projects yet. Add the first piece of work for {client.companyName}.
        </p>
      );
    }

    return (
      <ul className="divide-y divide-line">
        {projects.data.projects.map((project) => {
          const overdue = isOverdue(project.dueDate, project.status);

          return (
            <li key={project.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-40 flex-1">
                <Link
                  to={`/projects/${project.id}`}
                  className="text-sm font-medium text-ink hover:text-brand-700 hover:underline"
                >
                  {project.name}
                </Link>
                <p className={`text-sm ${overdue ? "font-medium text-clay-700" : "text-ink-soft"}`}>
                  {project.dueDate
                    ? `${overdue ? "Overdue · " : "Due "}${formatDay(project.dueDate)}`
                    : "No due date"}
                </p>
              </div>
              <Badge tone={PROJECT_STATUS_TONES[project.status]} dot>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <Card
        title="Projects"
        actions={
          <Button
            size="sm"
            variant="secondary"
            disabled={Boolean(client.archivedAt)}
            onClick={() => {
              setAdding(true);
            }}
          >
            Add project
          </Button>
        }
      >
        {client.archivedAt && (
          <p className="mb-3 text-sm text-ink-soft">
            This client is archived. Restore it to add new projects.
          </p>
        )}
        {renderBody()}
      </Card>

      {adding && (
        <ProjectFormModal
          workspaceId={workspaceId}
          project={null}
          fixedClient={client}
          onClose={() => {
            setAdding(false);
          }}
        />
      )}
    </>
  );
};

export default ClientProjects;
