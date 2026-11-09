import { useTemplates } from "../../features/templates/useTemplates.js";

const TemplatePicker = ({ workspaceId, value, onChange }) => {
  const templates = useTemplates(workspaceId);
  const list = templates.data ?? [];

  if (list.length === 0) {
    return null;
  }

  const chosen = list.find((template) => {
    return template.id === value;
  });

  return (
    <div>
      <label htmlFor="project-template" className="mb-1.5 block text-sm font-medium text-ink">
        Start from a template
      </label>
      <select
        id="project-template"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <option value="">No template</option>
        {list.map((template) => {
          return (
            <option key={template.id} value={template.id}>
              {template.name} ({template.taskCount} {template.taskCount === 1 ? "task" : "tasks"})
            </option>
          );
        })}
      </select>
      <p className="mt-1.5 text-xs text-ink-muted">
        {chosen
          ? "The template's tasks are added as to do, unassigned."
          : "Optional. Adds a ready-made task list."}
      </p>
    </div>
  );
};

export default TemplatePicker;
