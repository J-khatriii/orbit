import FormError from "../auth/FormError.jsx";
import { Button, Input, Modal, useToast } from "../ui/index.js";
import { useAuth } from "../../features/auth/authContext.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { useClients } from "../../features/clients/useClients.js";
import { PROJECT_STATUS_LABELS } from "../../features/projects/constants.js";
import { useCreateProject, useUpdateProject } from "../../features/projects/useProjectMutations.js";
import { validateProjectForm } from "../../features/projects/validation.js";
import { minorToInput, parseMoney } from "../../lib/money.js";
import TemplatePicker from "../templates/TemplatePicker.jsx";

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

// The client picker lists up to this many active clients, A to Z. The server's maximum page.
export const CLIENT_PICKER_FILTERS = {
  view: "active",
  sort: "name",
  order: "asc",
  page: 1,
  pageSize: 100,
};

const valuesOf = (project, fixedClient, defaultCurrency) => {
  return {
    name: project?.name ?? "",
    clientId: fixedClient?.id ?? project?.clientId ?? "",
    status: project?.status ?? "planned",
    startDate: project?.startDate ?? "",
    dueDate: project?.dueDate ?? "",
    budget:
      project?.budgetMinor === null || project?.budgetMinor === undefined
        ? ""
        : minorToInput(project.budgetMinor, project.currency ?? defaultCurrency),
    currency: project?.currency ?? "",
    description: project?.description ?? "",
    templateId: "",
  };
};

// Show this to add a project (project = null) or to edit one.
//   fixedClient   when set ({ id, companyName }), the client can't be picked, for adding
//                 from a client's own page
// The parent mounts it only while it's open, so every opening starts with fresh values.
const ProjectFormModal = ({ workspaceId, project, fixedClient, onClose }) => {
  const toast = useToast();
  const { activeWorkspace } = useAuth();
  const defaultCurrency = activeWorkspace?.defaultCurrency;
  const create = useCreateProject();
  const update = useUpdateProject();
  const clients = useClients(workspaceId, CLIENT_PICKER_FILTERS, !project && !fixedClient);
  const form = useAuthForm(valuesOf(project, fixedClient, defaultCurrency));
  const saving = create.isPending || update.isPending;
  // The client is chosen once, when the project is created.
  const needsClient = !project && !fixedClient;

  const save = (values, options) => {
    const currency = values.currency.trim();
    const money = parseMoney(values.budget, currency.toUpperCase() || defaultCurrency || "USD");
    const input = {
      name: values.name.trim(),
      status: values.status,
      startDate: values.startDate,
      dueDate: values.dueDate,
      budgetMinor: money.minor,
      currency,
      description: values.description.trim(),
    };
    const handlers = {
      ...options,
      onSuccess: () => {
        onClose();
        toast.show(project ? `${input.name} was updated.` : `${input.name} was added.`);
      },
    };

    if (project) {
      update.mutate({ workspaceId, projectId: project.id, input }, handlers);
    } else {
      create.mutate(
        {
          workspaceId,
          input: {
            ...input,
            clientId: values.clientId,
            templateId: values.templateId || null,
          },
        },
        handlers,
      );
    }
  };

  const handleSubmit = form.handleSubmit(
    (values) => {
      return validateProjectForm(values, { needsClient, fallbackCurrency: defaultCurrency });
    },
    save,
    { CLIENT_ARCHIVED: "clientId", CLIENT_NOT_FOUND: "clientId" },
  );

  const clientName = project?.clientName ?? fixedClient?.companyName;

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? "Edit project" : "Add a project"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSubmit}>
            {project ? "Save changes" : "Add project"}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <FormError message={form.formError} />
        {!project && (
          <TemplatePicker
            workspaceId={workspaceId}
            value={form.values.templateId}
            onChange={(templateId) => {
              form.setValue("templateId", templateId);
            }}
          />
        )}
        <Input
          label="Project name"
          name="name"
          autoComplete="off"
          value={form.values.name}
          onChange={form.handleChange("name")}
          error={form.errors.name}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="project-client" className="mb-1.5 block text-sm font-medium text-ink">
              Client
            </label>
            {needsClient ? (
              <select
                id="project-client"
                value={form.values.clientId}
                disabled={clients.isPending}
                onChange={form.handleChange("clientId")}
                className={controlClass}
              >
                <option value="">{clients.isPending ? "Loading…" : "Choose a client…"}</option>
                {(clients.data?.clients ?? []).map((client) => {
                  return (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="rounded-control bg-sunken px-3 py-2.5 text-sm text-ink-soft">
                {clientName}
              </p>
            )}
            {form.errors.clientId && (
              <p className="mt-1.5 text-sm text-clay-600">{form.errors.clientId}</p>
            )}
          </div>

          <div>
            <label htmlFor="project-status" className="mb-1.5 block text-sm font-medium text-ink">
              Status
            </label>
            <select
              id="project-status"
              value={form.values.status}
              onChange={form.handleChange("status")}
              className={controlClass}
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => {
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start date"
            name="startDate"
            type="date"
            value={form.values.startDate}
            onChange={form.handleChange("startDate")}
            error={form.errors.startDate}
          />
          <Input
            label="Due date"
            name="dueDate"
            type="date"
            value={form.values.dueDate}
            onChange={form.handleChange("dueDate")}
            error={form.errors.dueDate}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Input
            label="Budget"
            name="budget"
            inputMode="decimal"
            placeholder="12500.00"
            value={form.values.budget}
            onChange={form.handleChange("budget")}
            error={form.errors.budget}
          />
          <Input
            label="Currency"
            name="currency"
            placeholder={defaultCurrency ?? "USD"}
            value={form.values.currency}
            onChange={form.handleChange("currency")}
            error={form.errors.currency}
          />
        </div>

        <div>
          <label
            htmlFor="project-description"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Description
          </label>
          <textarea
            id="project-description"
            rows={3}
            value={form.values.description}
            onChange={form.handleChange("description")}
            className={controlClass}
          />
          {form.errors.description && (
            <p className="mt-1.5 text-sm text-clay-600">{form.errors.description}</p>
          )}
        </div>

        {/* Lets Enter submit the form. The visible buttons are in the dialog footer. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
};

export default ProjectFormModal;
