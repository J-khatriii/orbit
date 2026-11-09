import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "../ui/index.js";
import { TASK_PRIORITY_LABELS } from "../../features/tasks/constants.js";
import { MAX_TASKS, newTaskRow } from "../../features/templates/templateForm.js";

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60";

const IconButton = ({ label, disabled, onClick, children }) => {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
};

const TemplateTasksEditor = ({ tasks, errors, readOnly, onChange }) => {
  const rowErrors = errors?.rows ?? {};

  const updateRow = (key, changes) => {
    onChange(
      tasks.map((task) => {
        return task.key === key ? { ...task, ...changes } : task;
      }),
    );
  };

  const moveRow = (index, step) => {
    const next = [...tasks];
    const [row] = next.splice(index, 1);

    next.splice(index + step, 0, row);
    onChange(next);
  };

  const removeRow = (key) => {
    onChange(
      tasks.filter((task) => {
        return task.key !== key;
      }),
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Tasks</p>
        <p className="text-xs text-ink-muted">
          {tasks.length} of {MAX_TASKS}
        </p>
      </div>

      {tasks.length === 0 && (
        <p className="rounded-control bg-sunken px-3 py-3 text-sm text-ink-soft">
          {readOnly ? "This template has no tasks." : "No tasks yet. Add the first one below."}
        </p>
      )}

      <ol className="space-y-2">
        {tasks.map((task, index) => {
          const problems = rowErrors[task.key] ?? {};

          return (
            <li key={task.key} className="rounded-control border border-line bg-surface p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 w-5 shrink-0 text-xs text-ink-muted tabular-nums">
                  {index + 1}.
                </span>

                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <input
                      type="text"
                      aria-label={`Task ${index + 1} title`}
                      placeholder="Task title"
                      autoComplete="off"
                      disabled={readOnly}
                      value={task.title}
                      onChange={(event) => {
                        updateRow(task.key, { title: event.target.value });
                      }}
                      className={controlClass}
                    />
                    {problems.title && (
                      <p className="mt-1 text-sm text-clay-600">{problems.title}</p>
                    )}
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      aria-label={`Task ${index + 1} notes`}
                      placeholder="Notes (optional)"
                      disabled={readOnly}
                      value={task.description}
                      onChange={(event) => {
                        updateRow(task.key, { description: event.target.value });
                      }}
                      className={controlClass}
                    />
                    {problems.description && (
                      <p className="mt-1 text-sm text-clay-600">{problems.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start gap-3">
                    <select
                      aria-label={`Task ${index + 1} priority`}
                      disabled={readOnly}
                      value={task.priority}
                      onChange={(event) => {
                        updateRow(task.key, { priority: event.target.value });
                      }}
                      className={`${controlClass} w-auto`}
                    >
                      {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => {
                        return (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-ink-soft">
                        Due after
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Task ${index + 1} due after how many days`}
                          placeholder="—"
                          disabled={readOnly}
                          value={task.dueOffsetDays}
                          onChange={(event) => {
                            updateRow(task.key, { dueOffsetDays: event.target.value });
                          }}
                          className={`${controlClass} w-16 text-center`}
                        />
                        days
                      </label>
                      {problems.dueOffsetDays && (
                        <p className="mt-1 text-sm text-clay-600">{problems.dueOffsetDays}</p>
                      )}
                    </div>
                  </div>
                </div>

                {!readOnly && (
                  <div className="flex shrink-0 flex-col">
                    <IconButton
                      label={`Move task ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => {
                        moveRow(index, -1);
                      }}
                    >
                      <ChevronUp className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Move task ${index + 1} down`}
                      disabled={index === tasks.length - 1}
                      onClick={() => {
                        moveRow(index, 1);
                      }}
                    >
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Remove task ${index + 1}`}
                      onClick={() => {
                        removeRow(task.key);
                      }}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {errors?.tasks && <p className="mt-1.5 text-sm text-clay-600">{errors.tasks}</p>}

      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={tasks.length >= MAX_TASKS}
            onClick={() => {
              onChange([...tasks, newTaskRow()]);
            }}
          >
            Add a task
          </Button>
          <p className="text-xs text-ink-muted">
            &ldquo;Due after&rdquo; counts from the project&apos;s start date, or from the day you
            create it if it has none.
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateTasksEditor;
