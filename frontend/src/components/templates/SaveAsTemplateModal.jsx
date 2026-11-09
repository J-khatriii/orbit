import FormError from "../auth/FormError.jsx";
import { Button, Input, Modal, useToast } from "../ui/index.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { useSaveProjectAsTemplate } from "../../features/templates/useTemplateMutations.js";

const validate = (values) => {
  const errors = {};
  const name = values.name.trim();

  if (!name) {
    errors.name = "Enter a template name";
  } else if (name.length > 120) {
    errors.name = "Use at most 120 characters";
  }
  if (values.description.trim().length > 5000) {
    errors.description = "Use at most 5000 characters";
  }

  return errors;
};

// Mount this only while it's open, so the form starts fresh each time.
const SaveAsTemplateModal = ({ workspaceId, project, onClose }) => {
  const toast = useToast();
  const save = useSaveProjectAsTemplate();
  const form = useAuthForm({
    name: project.name,
    description: project.description ?? "",
  });

  const run = (values, options) => {
    const input = {
      name: values.name.trim(),
      description: values.description.trim(),
    };

    save.mutate(
      { workspaceId, projectId: project.id, input },
      {
        ...options,
        onSuccess: () => {
          // Close first: a toast would be hidden behind the dialog.
          onClose();
          toast.show(`Saved as the template ${input.name}.`);
        },
      },
    );
  };

  const handleSubmit = form.handleSubmit(validate, run, { TEMPLATE_EXISTS: "name" });

  return (
    <Modal
      open
      onClose={onClose}
      title="Save as template"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={handleSubmit}>
            Save template
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <FormError message={form.formError} />
        <p className="text-sm text-ink-soft">
          This copies the project&apos;s tasks into a new template: titles, notes and priorities.
          Assignees, status and dates are left out. Due dates become days after the start, based on
          the project&apos;s start date.
        </p>
        <Input
          label="Template name"
          name="name"
          autoComplete="off"
          value={form.values.name}
          onChange={form.handleChange("name")}
          error={form.errors.name}
        />
        <div>
          <label
            htmlFor="save-template-description"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Description
          </label>
          <textarea
            id="save-template-description"
            rows={2}
            value={form.values.description}
            onChange={form.handleChange("description")}
            className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          {form.errors.description && (
            <p className="mt-1.5 text-sm text-clay-600">{form.errors.description}</p>
          )}
        </div>
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
};

export default SaveAsTemplateModal;
