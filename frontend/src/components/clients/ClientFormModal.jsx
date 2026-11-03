import FormError from "../auth/FormError.jsx";
import { Button, Input, Modal, useToast } from "../ui/index.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { STATUS_LABELS } from "../../features/clients/constants.js";
import { useCreateClient, useUpdateClient } from "../../features/clients/useClientMutations.js";
import { parseTags, validateClientForm } from "../../features/clients/validation.js";

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

const EMPTY = {
  companyName: "",
  status: "lead",
  billingEmail: "",
  billingAddress: "",
  taxId: "",
  currency: "",
  tags: "",
  notesInternal: "",
};

const valuesOf = (client) => {
  if (!client) {
    return EMPTY;
  }

  return {
    companyName: client.companyName,
    status: client.status,
    billingEmail: client.billingEmail ?? "",
    billingAddress: client.billingAddress ?? "",
    taxId: client.taxId ?? "",
    currency: client.currency ?? "",
    tags: client.tags.join(", "),
    notesInternal: client.notesInternal ?? "",
  };
};

// Blank boxes are sent as "", which the server stores as "nothing".
const payloadOf = (values) => {
  return {
    companyName: values.companyName.trim(),
    status: values.status,
    billingEmail: values.billingEmail.trim(),
    billingAddress: values.billingAddress.trim(),
    taxId: values.taxId.trim(),
    currency: values.currency.trim(),
    tags: parseTags(values.tags),
    notesInternal: values.notesInternal.trim(),
  };
};

// Show this to add a client (client = null) or to edit one. The parent mounts it only while
// it's open, so every opening starts with fresh values.
const ClientFormModal = ({ workspaceId, client, onClose }) => {
  const toast = useToast();
  const create = useCreateClient();
  const update = useUpdateClient();
  const form = useAuthForm(valuesOf(client));
  const saving = create.isPending || update.isPending;

  const save = (values, options) => {
    const input = payloadOf(values);
    const handlers = {
      ...options,
      onSuccess: () => {
        onClose();
        toast.show(
          client ? `${input.companyName} was updated.` : `${input.companyName} was added.`,
        );
      },
    };

    if (client) {
      update.mutate({ workspaceId, clientId: client.id, input }, handlers);
    } else {
      create.mutate({ workspaceId, input }, handlers);
    }
  };

  const handleSubmit = form.handleSubmit(validateClientForm, save, {
    CLIENT_EXISTS: "companyName",
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={client ? "Edit client" : "Add a client"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSubmit}>
            {client ? "Save changes" : "Add client"}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <FormError message={form.formError} />
        <Input
          label="Company name"
          name="companyName"
          autoComplete="off"
          value={form.values.companyName}
          onChange={form.handleChange("companyName")}
          error={form.errors.companyName}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="client-status" className="mb-1.5 block text-sm font-medium text-ink">
              Status
            </label>
            <select
              id="client-status"
              value={form.values.status}
              onChange={form.handleChange("status")}
              className={controlClass}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => {
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            {form.errors.status && (
              <p className="mt-1.5 text-sm text-clay-600">{form.errors.status}</p>
            )}
          </div>
          <Input
            label="Currency"
            name="currency"
            placeholder="USD"
            hint="Empty uses your workspace default."
            value={form.values.currency}
            onChange={form.handleChange("currency")}
            error={form.errors.currency}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Billing email"
            name="billingEmail"
            type="email"
            autoComplete="off"
            value={form.values.billingEmail}
            onChange={form.handleChange("billingEmail")}
            error={form.errors.billingEmail}
          />
          <Input
            label="Tax ID"
            name="taxId"
            autoComplete="off"
            value={form.values.taxId}
            onChange={form.handleChange("taxId")}
            error={form.errors.taxId}
          />
        </div>

        <div>
          <label htmlFor="client-address" className="mb-1.5 block text-sm font-medium text-ink">
            Billing address
          </label>
          <textarea
            id="client-address"
            rows={3}
            value={form.values.billingAddress}
            onChange={form.handleChange("billingAddress")}
            className={controlClass}
          />
          {form.errors.billingAddress && (
            <p className="mt-1.5 text-sm text-clay-600">{form.errors.billingAddress}</p>
          )}
        </div>

        <Input
          label="Tags"
          name="tags"
          placeholder="design, retainer"
          hint="Separate tags with commas."
          value={form.values.tags}
          onChange={form.handleChange("tags")}
          error={form.errors.tags}
        />

        <div>
          <label htmlFor="client-notes" className="mb-1.5 block text-sm font-medium text-ink">
            Internal notes
          </label>
          <textarea
            id="client-notes"
            rows={3}
            value={form.values.notesInternal}
            onChange={form.handleChange("notesInternal")}
            className={controlClass}
          />
          <p className="mt-1.5 text-xs text-ink-muted">Only your team sees this.</p>
          {form.errors.notesInternal && (
            <p className="mt-1.5 text-sm text-clay-600">{form.errors.notesInternal}</p>
          )}
        </div>

        {/* Lets Enter submit the form. The visible buttons are in the dialog footer. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
};

export default ClientFormModal;
