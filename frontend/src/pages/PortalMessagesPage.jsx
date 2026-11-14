import { useState } from "react";
import PortalConversation from "../components/portal/PortalConversation.jsx";
import { Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { usePortalClients } from "../features/portal/usePortal.js";

const PortalMessagesPage = () => {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const isClient = activeWorkspace?.role === "client";
  const clients = usePortalClients(workspaceId, isClient);
  const [chosenId, setChosenId] = useState("");

  if (!isClient) {
    return (
      <Card title="Client portal">
        <p className="text-sm text-ink-soft">
          This page is what your clients see. People who work in this workspace use the Messages tab
          on each client instead.
        </p>
      </Card>
    );
  }

  if (clients.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (clients.isError) {
    return (
      <Card title="We couldn't load your messages">
        <p className="text-sm text-ink-soft">{clients.error.message}</p>
      </Card>
    );
  }

  const list = clients.data;
  const client =
    list.find((candidate) => {
      return candidate.id === chosenId;
    }) ?? list[0];

  if (!client) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
        <h2 className="font-display text-2xl text-ink">No conversations yet.</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          When your team gives you access, you can message them here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Messages</h1>
        {list.length > 1 ? (
          <div className="mt-3 max-w-xs">
            <label htmlFor="portal-client" className="mb-1.5 block text-sm font-medium text-ink">
              Conversation with
            </label>
            <select
              id="portal-client"
              value={client.id}
              onChange={(event) => {
                setChosenId(event.target.value);
              }}
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {list.map((candidate) => {
                return (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">With {client.name}</p>
        )}
      </div>

      <PortalConversation key={client.id} workspaceId={workspaceId} client={client} />
    </div>
  );
};

export default PortalMessagesPage;
