import { Ellipsis } from "lucide-react";
import { Dropdown, DropdownItem } from "../ui/index.js";

const TemplatesList = ({ templates, canManage, onOpen, onDelete }) => {
  return (
    <ul className="divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
      {templates.map((template) => {
        return (
          <li key={template.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  onOpen(template);
                }}
                className="block max-w-full truncate text-left text-sm font-medium text-ink hover:text-brand-700 hover:underline focus:outline-none focus-visible:underline"
              >
                {template.name}
              </button>
              {template.description && (
                <p className="truncate text-sm text-ink-soft">{template.description}</p>
              )}
            </div>

            <span className="shrink-0 text-sm text-ink-muted">
              {template.taskCount} {template.taskCount === 1 ? "task" : "tasks"}
            </span>

            {canManage && (
              <Dropdown
                align="right"
                renderTrigger={({ open, toggle, ref }) => {
                  return (
                    <button
                      ref={ref}
                      type="button"
                      aria-label={`Actions for ${template.name}`}
                      aria-expanded={open}
                      onClick={toggle}
                      className="grid size-8 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
                    >
                      <Ellipsis className="size-5" aria-hidden="true" />
                    </button>
                  );
                }}
              >
                {({ close }) => {
                  return (
                    <>
                      <DropdownItem
                        onClick={() => {
                          close();
                          onOpen(template);
                        }}
                      >
                        Edit
                      </DropdownItem>
                      <DropdownItem
                        onClick={() => {
                          close();
                          onDelete(template);
                        }}
                      >
                        Delete
                      </DropdownItem>
                    </>
                  );
                }}
              </Dropdown>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default TemplatesList;
