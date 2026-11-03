import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import ClientFormModal from "../components/clients/ClientFormModal.jsx";
import ClientsEmpty from "../components/clients/ClientsEmpty.jsx";
import ClientsSkeleton from "../components/clients/ClientsSkeleton.jsx";
import ClientsTable from "../components/clients/ClientsTable.jsx";
import ClientsToolbar from "../components/clients/ClientsToolbar.jsx";
import { Button, Card, Pagination, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { useSetClientArchived } from "../features/clients/useClientMutations.js";
import { useClientFilters } from "../features/clients/useClientFilters.js";
import { useClients, useClientTags } from "../features/clients/useClients.js";

const SEARCH_DELAY_MS = 300;

const ClientsPage = () => {
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canSee = role !== "client";
  const canArchive = role === "owner" || role === "admin";

  const { filters, apiFilters, setFilters, clear, isFiltered } = useClientFilters();
  // What's typed in the box right now. It reaches the address (and the server) a moment later.
  const [searchText, setSearchText] = useState(filters.search);
  // null = dialog closed, "new" = adding, or the client being edited.
  const [formTarget, setFormTarget] = useState(null);

  const clients = useClients(workspaceId, apiFilters, canSee);
  const tags = useClientTags(workspaceId, canSee);
  const setArchived = useSetClientArchived();
  const data = clients.data;

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

  // If the last client on a page was archived, the page no longer exists. Step back.
  useEffect(() => {
    if (
      data &&
      data.clients.length === 0 &&
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

  const handleToggleArchive = (client) => {
    const archived = !client.archivedAt;

    setArchived.mutate(
      { workspaceId, clientId: client.id, archived },
      {
        onSuccess: () => {
          toast.show(`${client.companyName} was ${archived ? "archived" : "restored"}.`);
        },
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  if (!canSee) {
    return (
      <Card title="Clients">
        <p className="text-sm text-ink-soft">
          The client list is only available to people who work in this workspace.
        </p>
      </Card>
    );
  }

  const addButton = (
    <Button
      icon={Plus}
      onClick={() => {
        setFormTarget("new");
      }}
    >
      Add client
    </Button>
  );

  const renderList = () => {
    if (clients.isPending) {
      return <ClientsSkeleton />;
    }
    if (clients.isError) {
      return (
        <Card title="We couldn't load your clients">
          <p className="mb-4 text-sm text-ink-soft">{clients.error.message}</p>
          <Button variant="secondary" onClick={clients.refetch}>
            Try again
          </Button>
        </Card>
      );
    }
    if (data.meta.total === 0) {
      return <ClientsEmpty filtered={isFiltered} onClear={handleClear} action={addButton} />;
    }

    return (
      <>
        <div className={clients.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <ClientsTable
            clients={data.clients}
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
          <h1 className="font-display text-3xl text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data ? `${data.meta.total} ${data.meta.total === 1 ? "client" : "clients"}` : "\u00a0"}
          </p>
        </div>
        {addButton}
      </div>

      <ClientsToolbar
        filters={filters}
        tags={tags.data ?? []}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onChange={setFilters}
        onClear={handleClear}
        isFiltered={isFiltered}
      />

      {renderList()}

      {formTarget && (
        <ClientFormModal
          key={formTarget === "new" ? "new" : formTarget.id}
          workspaceId={workspaceId}
          client={formTarget === "new" ? null : formTarget}
          onClose={() => {
            setFormTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default ClientsPage;
