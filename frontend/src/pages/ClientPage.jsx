import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import ClientActivity from "../components/clients/ClientActivity.jsx";
import ClientDetails from "../components/clients/ClientDetails.jsx";
import ClientFormModal from "../components/clients/ClientFormModal.jsx";
import ClientTabs from "../components/clients/ClientTabs.jsx";
import { Avatar, Badge, Button, Card, Spinner, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { STATUS_LABELS, STATUS_TONES } from "../features/clients/constants.js";
import { useSetClientArchived } from "../features/clients/useClientMutations.js";
import { useClient } from "../features/clients/useClients.js";
import ClientContacts from "../components/clients/ClientContacts.jsx";
import ClientProjects from "../components/clients/ClientProjects.jsx";
import ClientPortalAccess from "../components/clients/ClientPortalAccess.jsx";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "messages", label: "Messages", note: "Conversations with this client arrive in Phase 5." },
  { id: "files", label: "Files", note: "Shared files arrive in Phase 6." },
  { id: "invoices", label: "Invoices", note: "Invoices and payments arrive in Phase 7." },
];

const ClientPage = () => {
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canSee = role !== "client";
  const canArchive = role === "owner" || role === "admin";

  const [editing, setEditing] = useState(false);
  const clientQuery = useClient(workspaceId, clientId, canSee);
  const setArchived = useSetClientArchived();
  const client = clientQuery.data;

  const requestedTab = searchParams.get("tab");
  const tab =
    TABS.find((candidate) => {
      return candidate.id === requestedTab;
    }) ?? TABS[0];

  const changeTab = (id) => {
    setSearchParams(id === "overview" ? {} : { tab: id }, { replace: true });
  };

  const handleToggleArchive = () => {
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
      <Card title="Client">
        <p className="text-sm text-ink-soft">
          Client pages are only available to people who work in this workspace.
        </p>
      </Card>
    );
  }

  if (clientQuery.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (clientQuery.isError) {
    const missing = clientQuery.error.code === "CLIENT_NOT_FOUND";

    return (
      <Card title={missing ? "We couldn't find this client" : "We couldn't load this client"}>
        <p className="mb-4 text-sm text-ink-soft">
          {missing ? "It may have been removed, or the link is wrong." : clientQuery.error.message}
        </p>
        <Link to="/clients" className="text-sm font-medium text-brand-700 hover:underline">
          Back to all clients
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All clients
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={client.companyName} size="lg" square />
          <div className="min-w-0">
            <h1 className="font-display text-3xl wrap-break-word text-ink">{client.companyName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={STATUS_TONES[client.status]} dot>
                {STATUS_LABELS[client.status]}
              </Badge>
              {client.archivedAt && <Badge tone="clay">Archived</Badge>}
              {client.tags.map((tag) => {
                return (
                  <span
                    key={tag}
                    className="rounded-full bg-sunken px-2 py-0.5 text-xs text-ink-soft"
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
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
              {client.archivedAt ? "Restore" : "Archive"}
            </Button>
          )}
        </div>
      </header>

      <ClientTabs tabs={TABS} current={tab.id} onChange={changeTab} />

      <div role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`}>
        {tab.id === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <ClientContacts
                workspaceId={workspaceId}
                clientId={client.id}
                clientName={client.companyName}
              />
              {canArchive && (
                <ClientPortalAccess
                  workspaceId={workspaceId}
                  clientId={client.id}
                  clientName={client.companyName}
                />
              )}
              <ClientDetails client={client} defaultCurrency={activeWorkspace?.defaultCurrency} />
            </div>
            <ClientActivity workspaceId={workspaceId} clientId={client.id} />
          </div>
        )}
        {tab.id === "projects" && <ClientProjects workspaceId={workspaceId} client={client} />}
        {tab.note && (
          <Card title={tab.label}>
            <p className="text-sm text-ink-soft">{tab.note}</p>
          </Card>
        )}
      </div>

      {editing && (
        <ClientFormModal
          workspaceId={workspaceId}
          client={client}
          onClose={() => {
            setEditing(false);
          }}
        />
      )}
    </div>
  );
};

export default ClientPage;
