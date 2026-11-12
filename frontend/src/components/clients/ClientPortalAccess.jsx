import { useState } from "react";
import { Avatar, Button, Card, Modal, Spinner, useToast } from "../ui/index.js";
import {
  useAccessCandidates,
  useClientAccess,
} from "../../features/clientAccess/useClientAccess.js";
import {
  useGrantAccess,
  useRevokeAccess,
} from "../../features/clientAccess/useClientAccessMutations.js";

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

const ClientPortalAccess = ({ workspaceId, clientId, clientName }) => {
  const toast = useToast();
  const access = useClientAccess(workspaceId, clientId);
  const candidates = useAccessCandidates(workspaceId, clientId);
  const grant = useGrantAccess();
  const revoke = useRevokeAccess();
  const [chosen, setChosen] = useState("");
  const [removing, setRemoving] = useState(null);

  const people = access.data ?? [];
  const available = candidates.data ?? [];

  const handleAdd = () => {
    const person = available.find((candidate) => {
      return candidate.userId === chosen;
    });

    if (!person) {
      return;
    }

    grant.mutate(
      { workspaceId, clientId, userId: person.userId },
      {
        onSuccess: () => {
          setChosen("");
          toast.show(`${person.name} was given access.`);
        },
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  const handleRemove = () => {
    const person = removing;

    revoke.mutate(
      { workspaceId, clientId, userId: person.userId },
      {
        onSuccess: () => {
          // Close the dialog first: a toast would be hidden behind it.
          setRemoving(null);
          toast.show(`${person.name}'s access was removed.`);
        },
        onError: (error) => {
          setRemoving(null);
          toast.show(error.message);
        },
      },
    );
  };

  const renderPeople = () => {
    if (access.isPending) {
      return (
        <div role="status" className="flex justify-center py-6 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (access.isError) {
      return <p className="text-sm text-clay-700">{access.error.message}</p>;
    }
    if (people.length === 0) {
      return (
        <p className="rounded-control bg-sunken px-3 py-3 text-sm text-ink-soft">
          Nobody has portal access to {clientName} yet.
        </p>
      );
    }

    return (
      <ul className="divide-y divide-line">
        {people.map((person) => {
          return (
            <li key={person.userId} className="flex items-center gap-3 py-2.5">
              <Avatar name={person.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{person.name}</p>
                <p className="truncate text-sm text-ink-soft">{person.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRemoving(person);
                }}
              >
                Remove
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderPicker = () => {
    if (candidates.isPending || candidates.isError) {
      return null;
    }
    if (available.length === 0) {
      return (
        <p className="text-sm text-ink-soft">
          No other client users to add. Invite someone with the Client role first.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="portal-person" className="mb-1.5 block text-sm font-medium text-ink">
            Give access to
          </label>
          <select
            id="portal-person"
            value={chosen}
            onChange={(event) => {
              setChosen(event.target.value);
            }}
            className={controlClass}
          >
            <option value="">Choose a person…</option>
            {available.map((person) => {
              return (
                <option key={person.userId} value={person.userId}>
                  {person.name} ({person.email})
                </option>
              );
            })}
          </select>
        </div>
        <Button loading={grant.isPending} disabled={!chosen} onClick={handleAdd}>
          Add
        </Button>
      </div>
    );
  };

  return (
    <Card title="Portal access">
      <p className="mb-3 text-sm text-ink-soft">
        People here will see this client&apos;s projects in the client portal.
      </p>
      {renderPeople()}
      <div className="mt-4">{renderPicker()}</div>

      <Modal
        open={Boolean(removing)}
        onClose={() => {
          setRemoving(null);
        }}
        title={`Remove ${removing?.name ?? ""}?`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRemoving(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={revoke.isPending} onClick={handleRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          They will no longer see {clientName} in the portal. You can add them again later.
        </p>
      </Modal>
    </Card>
  );
};

export default ClientPortalAccess;
