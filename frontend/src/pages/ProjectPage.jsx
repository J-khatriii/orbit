import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import ProjectActivity from "../components/projects/ProjectActivity.jsx";
import ProjectDetails from "../components/projects/ProjectDetails.jsx";
import ProjectFormModal from "../components/projects/ProjectFormModal.jsx";
import ProjectTeam from "../components/projects/ProjectTeam.jsx";
import { Badge, Button, Card, Spinner, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES } from "../features/projects/constants.js";
import { useSetProjectArchived } from "../features/projects/useProjectMutations.js";
import { useProject } from "../features/projects/useProjects.js";

const ProjectPage = () => {
  const { projectId } = useParams();
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canSee = role !== "client";
  const canArchive = role === "owner" || role === "admin";

  const [editing, setEditing] = useState(false);
  const projectQuery = useProject(workspaceId, projectId, canSee);
  const setArchived = useSetProjectArchived();
  const project = projectQuery.data;

  const handleToggleArchive = () => {
    const archived = !project.archivedAt;

    setArchived.mutate(
      { workspaceId, projectId: project.id, archived },
      {
        onSuccess: () => {
          toast.show(`${project.name} was ${archived ? "archived" : "restored"}.`);
        },
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  if (!canSee) {
    return (
      <Card title="Project">
        <p className="text-sm text-ink-soft">
          Project pages are only available to people who work in this workspace.
        </p>
      </Card>
    );
  }

  if (projectQuery.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (projectQuery.isError) {
    const missing = projectQuery.error.code === "PROJECT_NOT_FOUND";

    return (
      <Card title={missing ? "We couldn't find this project" : "We couldn't load this project"}>
        <p className="mb-4 text-sm text-ink-soft">
          {missing ? "It may have been removed, or the link is wrong." : projectQuery.error.message}
        </p>
        <Link to="/projects" className="text-sm font-medium text-brand-700 hover:underline">
          Back to all projects
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All projects
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl break-words text-ink">{project.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            for{" "}
            <Link to={`/clients/${project.clientId}`} className="text-brand-700 hover:underline">
              {project.clientName}
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={PROJECT_STATUS_TONES[project.status]} dot>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            {project.archivedAt && <Badge tone="clay">Archived</Badge>}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(true);
            }}
          >
            Edit
          </Button>
          {canArchive && (
            <Button
              variant="secondary"
              loading={setArchived.isPending}
              onClick={handleToggleArchive}
            >
              {project.archivedAt ? "Restore" : "Archive"}
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ProjectDetails project={project} defaultCurrency={activeWorkspace?.defaultCurrency} />
          <ProjectTeam workspaceId={workspaceId} project={project} />
        </div>
        <ProjectActivity workspaceId={workspaceId} projectId={project.id} />
      </div>

      {editing && (
        <ProjectFormModal
          workspaceId={workspaceId}
          project={project}
          onClose={() => {
            setEditing(false);
          }}
        />
      )}
    </div>
  );
};

export default ProjectPage;
