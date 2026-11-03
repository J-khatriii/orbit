import { useState } from "react";
import { Avatar, Badge, Button, Card, Modal, Spinner, useToast } from "../ui/index.js";
import { useDeleteContact, useUpdateContact } from "../../features/clients/useContactMutations.js";
import { useContacts } from "../../features/clients/useContacts.js";
import ContactFormModal from "./ContactFormModal.jsx";

const ContactRow = ({ contact, busy, onEdit, onMakePrimary, onRemove }) => {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={contact.name} />
      <div className="min-w-40 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
          {contact.name}
          {contact.isPrimary && <Badge tone="brand">Primary</Badge>}
        </p>
        {contact.jobTitle && <p className="text-sm text-ink-soft">{contact.jobTitle}</p>}
        {(contact.email || contact.phone) && (
          <p className="text-sm break-words text-ink-soft">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="text-brand-700 hover:underline">
                {contact.email}
              </a>
            )}
            {contact.email && contact.phone && " · "}
            {contact.phone}
          </p>
        )}
      </div>
      <div className="ml-auto flex flex-wrap gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        {!contact.isPrimary && (
          <Button variant="ghost" size="sm" loading={busy} onClick={onMakePrimary}>
            Make primary
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </li>
  );
};

const ClientContacts = ({ workspaceId, clientId, clientName }) => {
  const toast = useToast();
  const contacts = useContacts(workspaceId, clientId);
  const update = useUpdateContact();
  const remove = useDeleteContact();
  // null = no dialog, "new" = adding, or the contact being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [removing, setRemoving] = useState(null);

  const handleMakePrimary = (contact) => {
    update.mutate(
      { workspaceId, clientId, contactId: contact.id, input: { isPrimary: true } },
      {
        onSuccess: () => {
          toast.show(`${contact.name} is now the primary contact.`);
        },
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  const confirmRemove = () => {
    remove.mutate(
      { workspaceId, clientId, contactId: removing.id },
      {
        onSuccess: () => {
          toast.show(`${removing.name} was removed.`);
          setRemoving(null);
        },
        onError: (error) => {
          // Close the dialog first, so the message isn't hidden behind it.
          setRemoving(null);
          toast.show(error.message);
        },
      },
    );
  };

  const renderBody = () => {
    if (contacts.isPending) {
      return (
        <div role="status" className="flex justify-center py-6 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (contacts.isError) {
      return <p className="text-sm text-clay-700">{contacts.error.message}</p>;
    }
    if (contacts.data.length === 0) {
      return (
        <p className="text-sm text-ink-soft">
          No contacts yet. Add the people you work with at {clientName}.
        </p>
      );
    }

    return (
      <ul className="divide-y divide-line">
        {contacts.data.map((contact) => {
          return (
            <ContactRow
              key={contact.id}
              contact={contact}
              busy={update.isPending && update.variables?.contactId === contact.id}
              onEdit={() => {
                setFormTarget(contact);
              }}
              onMakePrimary={() => {
                handleMakePrimary(contact);
              }}
              onRemove={() => {
                setRemoving(contact);
              }}
            />
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <Card
        title="Contacts"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setFormTarget("new");
            }}
          >
            Add contact
          </Button>
        }
      >
        {renderBody()}
      </Card>

      {formTarget && (
        <ContactFormModal
          key={formTarget === "new" ? "new" : formTarget.id}
          workspaceId={workspaceId}
          clientId={clientId}
          contact={formTarget === "new" ? null : formTarget}
          hasContacts={(contacts.data?.length ?? 0) > 0}
          onClose={() => {
            setFormTarget(null);
          }}
        />
      )}

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
            <Button variant="danger" loading={remove.isPending} onClick={confirmRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          This can&apos;t be undone. If they are the primary contact, the person added first takes
          over as primary.
        </p>
      </Modal>
    </>
  );
};

export default ClientContacts;
