import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import ProjectFormModal, {
  CLIENT_PICKER_FILTERS,
} from "../components/projects/ProjectFormModal.jsx";
import ProjectsEmpty from "../components/projects/ProjectsEmpty.jsx";
import ProjectsSkeleton from "../components/projects/ProjectsSkeleton.jsx";
import ProjectsTable from "../components/projects/ProjectsTable.jsx";
import ProjectsToolbar from "../components/projects/ProjectsToolbar.jsx";
import { Button, Card, Pagination, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { useClients } from "../features/clients/useClients.js";
import { useProjectFilters } from "../features/projects/useProjectFilters.js";
import { useSetProjectArchived } from "../features/projects/useProjectMutations.js";
import { useProjects } from "../features/projects/useProjects.js";

const SEARCH_DELAY_MS = 300;

const ProjectsPage = () => {
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canSee = role !== "client";
  const canArchive = role === "owner" || role === "admin";

  const { filters, apiFilters, setFilters, clear, isFiltered } = useProjectFilters();
  // What's typed in the box right now. It reaches the address (and the server) a moment later.
  const [searchText, setSearchText] = useState(filters.search);
  // null = dialog closed, "new" = adding, or the project being edited.
  const [formTarget, setFormTarget] = useState(null);

  const projects = useProjects(workspaceId, apiFilters, canSee);
  const clients = useClients(workspaceId, CLIENT_PICKER_FILTERS, canSee);
  const setArchived = useSetProjectArchived();
  const data = projects.data;
  const noClients = clients.isSuccess && clients.data.meta.total === 0;

  useEffect(() => {
    if (searchText === filters.search) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setFilters({ search: searchText });
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [searchText, filters.search, setFilters]);

  // If the last project on a page was archived, the page no longer exists. Step back.
  useEffect(() => {
    if (
      data &&
      data.projects.length === 0 &&
      data.meta.total > 0 &&
      filters.page > data.meta.totalPages
    ) {
      setFilters({ page: data.meta.totalPages });
    }
  }, [data, filters.page, setFilters]);

  const handleClear = () => {
    setSearchText("");
    clear();
  };

  const handleToggleArchive = (project) => {
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
      <Card title="Projects">
        <p className="text-sm text-ink-soft">
          The project list is only available to people who work in this workspace.
        </p>
      </Card>
    );
  }

  const addButton = (
    <Button
      icon={Plus}
      disabled={noClients}
      onClick={() => {
        setFormTarget("new");
      }}
    >
      Add project
    </Button>
  );

  const renderList = () => {
    if (projects.isPending) {
      return <ProjectsSkeleton />;
    }
    if (projects.isError) {
      return (
        <Card title="We couldn't load your projects">
          <p className="mb-4 text-sm text-ink-soft">{projects.error.message}</p>
          <Button variant="secondary" onClick={projects.refetch}>
            Try again
          </Button>
        </Card>
      );
    }
    if (data.meta.total === 0) {
      return (
        <ProjectsEmpty
          filtered={isFiltered}
          noClients={noClients}
          onClear={handleClear}
          action={addButton}
        />
      );
    }

    return (
      <>
        <div className={projects.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <ProjectsTable
            projects={data.projects}
            canArchive={canArchive}
            onEdit={setFormTarget}
            onToggleArchive={handleToggleArchive}
          />
        </div>
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={(page) => {
            setFilters({ page });
          }}
        />
      </>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data
              ? `${data.meta.total} ${data.meta.total === 1 ? "project" : "projects"}`
              : "\u00a0"}
          </p>
        </div>
        {addButton}
      </div>

      <ProjectsToolbar
        filters={filters}
        clients={clients.data?.clients ?? []}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onChange={setFilters}
        onClear={handleClear}
        isFiltered={isFiltered}
      />

      {renderList()}

      {formTarget && (
        <ProjectFormModal
          key={formTarget === "new" ? "new" : formTarget.id}
          workspaceId={workspaceId}
          project={formTarget === "new" ? null : formTarget}
          onClose={() => {
            setFormTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
