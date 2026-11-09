import { useState } from "react";
import FormError from "../auth/FormError.jsx";
import { Button, Input, SidePanel, useToast } from "../ui/index.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "../../features/tasks/constants.js";
import {
  changedFields,
  toInput,
  validateTaskForm,
  valuesOf,
} from "../../features/tasks/taskForm.js";
import { useDeleteTask, useUpdateTask } from "../../features/tasks/useTaskMutations.js";
import { timeAgo } from "../../lib/timeAgo.js";

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60";

const Label = ({ htmlFor, children }) => {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
    </label>
  );
};

const FieldError = ({ message }) => {
  return message ? <p className="mt-1.5 text-sm text-clay-600">{message}</p> : null;
};

// The parent mounts this with key={task.id}, so every task starts with fresh values.
const TaskDrawer = ({ workspaceId, project, task, locked, onClose }) => {
  const toast = useToast();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  // What the form looked like when it opened. We compare against this, not against the
  // live task, to know what the person changed.
  const [initial] = useState(() => {
    return valuesOf(task);
  });
  const form = useAuthForm(initial);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dirty = changedFields(form.values, initial).length > 0;

  // Closing by Escape, the X or a click outside asks first if there are unsaved changes.
  const requestClose = () => {
    if (dirty && !window.confirm("Discard your changes?")) {
      return;
    }

    onClose();
  };

  const save = (values, options) => {
    update.mutate(
      {
        workspaceId,
        projectId: project.id,
        taskId: task.id,
        input: toInput(values, initial),
      },
      {
        ...options,
        onSuccess: () => {
          onClose();
          toast.show("Task saved.");
        },
      },
    );
  };

  const handleSubmit = form.handleSubmit(validateTaskForm, save, {});

  const handleDelete = () => {
    remove.mutate(
      { workspaceId, projectId: project.id, taskId: task.id },
      {
        onSuccess: () => {
          onClose();
          toast.show(`${task.title} was deleted.`);
        },
        onError: (error) => {
          setConfirmingDelete(false);
          toast.show(error.message);
        },
      },
    );
  };

  return (
    <SidePanel
      open
      onClose={requestClose}
      title="Task"
      footer={
        locked ? null : (
          <>
            <Button variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button loading={update.isPending} disabled={!dirty} onClick={handleSubmit}>
              Save changes
            </Button>
          </>
        )
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <FormError message={form.formError} />
        {locked && (
          <p className="rounded-control bg-sunken px-3 py-2.5 text-sm text-ink-soft">
            This project is archived. Restore it to change its tasks.
          </p>
        )}

        <Input
          label="Title"
          name="title"
          autoComplete="off"
          disabled={locked}
          value={form.values.title}
          onChange={form.handleChange("title")}
          error={form.errors.title}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="task-status">Status</Label>
            <select
              id="task-status"
              disabled={locked}
              value={form.values.status}
              onChange={form.handleChange("status")}
              className={controlClass}
            >
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => {
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            <FieldError message={form.errors.status} />
          </div>
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <select
              id="task-priority"
              disabled={locked}
              value={form.values.priority}
              onChange={form.handleChange("priority")}
              className={controlClass}
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => {
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            <FieldError message={form.errors.priority} />
          </div>
        </div>

        <div>
          <Label htmlFor="task-assignee">Assignee</Label>
          <select
            id="task-assignee"
            disabled={locked}
            value={form.values.assigneeId}
            onChange={form.handleChange("assigneeId")}
            className={controlClass}
          >
            <option value="">Unassigned</option>
            {project.members.map((member) => {
              return (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              );
            })}
          </select>
          {project.members.length === 0 && (
            <p className="mt-1.5 text-sm text-ink-muted">
              Add people to the project&apos;s team (on the Overview tab) to assign tasks.
            </p>
          )}
          <FieldError message={form.errors.assigneeId} />
        </div>

        <Input
          label="Due date"
          name="dueDate"
          type="date"
          disabled={locked}
          value={form.values.dueDate}
          onChange={form.handleChange("dueDate")}
          error={form.errors.dueDate}
        />

        <div>
          <Label htmlFor="task-description">Description</Label>
          <textarea
            id="task-description"
            rows={5}
            disabled={locked}
            value={form.values.description}
            onChange={form.handleChange("description")}
            className={controlClass}
          />
          <FieldError message={form.errors.description} />
        </div>

        {/* Lets Enter in the title box submit the form. The visible buttons are in the footer. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>

      <p className="mt-6 text-xs text-ink-muted">
        Created {timeAgo(task.createdAt)}
        {task.completedAt ? ` · Completed ${timeAgo(task.completedAt)}` : ""}
      </p>

      {!locked && (
        <div className="mt-6 border-t border-line pt-4">
          {confirmingDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Delete this task for good? This can&apos;t be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirmingDelete(false);
                  }}
                >
                  Keep it
                </Button>
                <Button variant="danger" loading={remove.isPending} onClick={handleDelete}>
                  Delete task
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmingDelete(true);
              }}
            >
              Delete task
            </Button>
          )}
        </div>
      )}
    </SidePanel>
  );
};

export default TaskDrawer;
