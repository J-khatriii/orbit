import FormError from "../auth/FormError.jsx";
import TemplateTasksEditor from "./TemplateTasksEditor.jsx";
import { Button, Input, Modal, Spinner, useToast } from "../ui/index.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { toInput, validateTemplateForm, valuesOf } from "../../features/templates/templateForm.js";
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "../../features/templates/useTemplateMutations.js";
import { useTemplate } from "../../features/templates/useTemplates.js";

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60";

// The form itself. It's mounted only once the template (if any) has loaded, so its
// starting values are right from the first moment.
const TemplateEditor = ({ workspaceId, template, readOnly, onClose }) => {
  const toast = useToast();
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const form = useAuthForm(valuesOf(template));
  const saving = create.isPending || update.isPending;

  const save = (values, options) => {
    const input = toInput(values);
    const handlers = {
      ...options,
      onSuccess: () => {
        onClose();
        toast.show(template ? `${input.name} was updated.` : `${input.name} was created.`);
      },
    };

    if (template) {
      update.mutate({ workspaceId, templateId: template.id, input }, handlers);
    } else {
      create.mutate({ workspaceId, input }, handlers);
    }
  };

  const handleSubmit = form.handleSubmit(validateTemplateForm, save, {
    TEMPLATE_EXISTS: "name",
  });

  const changeTasks = (tasks) => {
    form.setValue("tasks", tasks);
    // Old messages about task rows no longer apply once the list changes.
    form.setErrors((current) => {
      return { ...current, rows: undefined };
    });
  };

  const title = readOnly ? "Template" : template ? "Edit template" : "New template";

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        readOnly ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSubmit}>
              {template ? "Save changes" : "Create template"}
            </Button>
          </>
        )
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <FormError message={form.formError} />
        <Input
          label="Name"
          name="name"
          autoComplete="off"
          disabled={readOnly}
          value={form.values.name}
          onChange={form.handleChange("name")}
          error={form.errors.name}
        />

        <div>
          <label
            htmlFor="template-description"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Description
          </label>
          <textarea
            id="template-description"
            rows={2}
            disabled={readOnly}
            value={form.values.description}
            onChange={form.handleChange("description")}
            className={controlClass}
          />
          {form.errors.description && (
            <p className="mt-1.5 text-sm text-clay-600">{form.errors.description}</p>
          )}
          {!readOnly && (
            <p className="mt-1.5 text-xs text-ink-muted">
              New projects start with this description unless you write their own.
            </p>
          )}
        </div>

        <TemplateTasksEditor
          tasks={form.values.tasks}
          errors={form.errors}
          readOnly={readOnly}
          onChange={changeTasks}
        />

        {/* Lets Enter in the name box submit the form. The visible buttons are in the footer. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
};

// templateId is empty to make a new template, or the id of the one to open.
const TemplateModal = ({ workspaceId, templateId, readOnly, onClose }) => {
  const detail = useTemplate(workspaceId, templateId, Boolean(templateId));

  if (templateId && detail.isPending) {
    return (
      <Modal open onClose={onClose} title="Template">
        <div role="status" className="flex justify-center py-10 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      </Modal>
    );
  }
  if (templateId && detail.isError) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Template"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <p className="text-sm text-clay-700">{detail.error.message}</p>
      </Modal>
    );
  }

  return (
    <TemplateEditor
      workspaceId={workspaceId}
      template={detail.data ?? null}
      readOnly={readOnly}
      onClose={onClose}
    />
  );
};

export default TemplateModal;
