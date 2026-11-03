import FormError from "../auth/FormError.jsx";
import { Button, Input, Modal, useToast } from "../ui/index.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { validateContactForm } from "../../features/clients/contactValidation.js";
import { useCreateContact, useUpdateContact } from "../../features/clients/useContactMutations.js";

const valuesOf = (contact) => {
  return {
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    jobTitle: contact?.jobTitle ?? "",
    isPrimary: false,
  };
};

// Show this to add a contact (contact = null) or to edit one. The parent mounts it only
// while it's open, so every opening starts with fresh values.
//   hasContacts   does this client already have contacts? The first one is always primary.
const ContactFormModal = ({ workspaceId, clientId, contact, hasContacts, onClose }) => {
  const toast = useToast();
  const create = useCreateContact();
  const update = useUpdateContact();
  const form = useAuthForm(valuesOf(contact));
  const saving = create.isPending || update.isPending;

  // Offer "make primary" only when it can change something: not for the very first
  // contact (always primary) and not for someone who already is.
  const showPrimaryOption = contact ? !contact.isPrimary : hasContacts;

  const save = (values, options) => {
    const input = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      jobTitle: values.jobTitle.trim(),
    };

    if (showPrimaryOption && values.isPrimary) {
      input.isPrimary = true;
    }

    const handlers = {
      ...options,
      onSuccess: () => {
        onClose();
        toast.show(contact ? `${input.name} was updated.` : `${input.name} was added.`);
      },
    };

    if (contact) {
      update.mutate({ workspaceId, clientId, contactId: contact.id, input }, handlers);
    } else {
      create.mutate({ workspaceId, clientId, input }, handlers);
    }
  };

  const handleSubmit = form.handleSubmit(validateContactForm, save);

  return (
    <Modal
      open
      onClose={onClose}
      title={contact ? "Edit contact" : "Add a contact"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSubmit}>
            {contact ? "Save changes" : "Add contact"}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <FormError message={form.formError} />
        <Input
          label="Name"
          name="name"
          autoComplete="off"
          value={form.values.name}
          onChange={form.handleChange("name")}
          error={form.errors.name}
        />
        <Input
          label="Job title"
          name="jobTitle"
          autoComplete="off"
          value={form.values.jobTitle}
          onChange={form.handleChange("jobTitle")}
          error={form.errors.jobTitle}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="off"
            value={form.values.email}
            onChange={form.handleChange("email")}
            error={form.errors.email}
          />
          <Input
            label="Phone"
            name="phone"
            autoComplete="off"
            value={form.values.phone}
            onChange={form.handleChange("phone")}
            error={form.errors.phone}
          />
        </div>

        {showPrimaryOption && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.values.isPrimary}
              onChange={(event) => {
                form.setValue("isPrimary", event.target.checked);
              }}
              className="size-4 rounded border-line accent-brand-600"
            />
            Make this the primary contact
          </label>
        )}
        {!contact && !hasContacts && (
          <p className="text-xs text-ink-muted">
            The first contact you add becomes the primary contact.
          </p>
        )}

        {/* Lets Enter submit the form. The visible buttons are in the dialog footer. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
};

export default ContactFormModal;
