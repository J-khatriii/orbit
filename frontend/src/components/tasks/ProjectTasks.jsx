import { useState } from "react";
import { useSearchParams } from "react-router";
import TaskBoard from "./TaskBoard.jsx";
import TaskDrawer from "./TaskDrawer.jsx";
import TaskQuickAdd from "./TaskQuickAdd.jsx";
import TaskRow from "./TaskRow.jsx";
import { Button, Modal, Spinner, useToast } from "../ui/index.js";
import { useDeleteTask, useUpdateTask } from "../../features/tasks/useTaskMutations.js";
import { useTasks } from "../../features/tasks/useTasks.js";
import { cn } from "../../lib/cn.js";

const VIEWS = [
  { id: "list", label: "List" },
  { id: "board", label: "Board" },
];

const matchesFilter = (task, filter) => {
  if (filter === "all") {
    return true;
  }

  return filter === "done" ? task.status === "done" : task.status !== "done";
};

const ProjectTasks = ({ workspaceId, project }) => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tasks = useTasks(workspaceId, project.id);
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [filter, setFilter] = useState("open");
  const [deleting, setDeleting] = useState(null);
  // An archived project's tasks can be read but not changed.
  const locked = Boolean(project.archivedAt);
  const busyId = update.isPending ? update.variables.taskId : null;
  // The view lives in the address (?view=board), so a reload keeps it.
  const view = searchParams.get("view") === "board" ? "board" : "list";
  // The open task lives in the address (?task=...), so it can be linked to, and Back closes it.
  const selectedId = searchParams.get("task");
  const selectedTask =
    (tasks.data ?? []).find((task) => {
      return task.id === selectedId;
    }) ?? null;

  const changeView = (next) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);

        if (next === "board") {
          params.set("view", "board");
        } else {
          params.delete("view");
        }

        return params;
      },
      { replace: true },
    );
  };

  const openTask = (task) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);

      params.set("task", task.id);

      return params;
    });
  };

  const closeTask = () => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);

        params.delete("task");

        return params;
      },
      { replace: true },
    );
  };

  const change = (task, input) => {
    update.mutate(
      { workspaceId, projectId: project.id, taskId: task.id, input },
      {
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  const handleToggleDone = (task) => {
    change(task, { status: task.status === "done" ? "todo" : "done" });
  };

  const handleChangeStatus = (task, status) => {
    change(task, { status });
  };

  const confirmDelete = () => {
    const task = deleting;

    remove.mutate(
      { workspaceId, projectId: project.id, taskId: task.id },
      {
        onSuccess: () => {
          // Close the dialog first: a toast would be hidden behind it.
          setDeleting(null);
          toast.show(`${task.title} was deleted.`);
        },
        onError: (error) => {
          setDeleting(null);
          toast.show(error.message);
        },
      },
    );
  };

  const renderList = () => {
    const visible = tasks.data.filter((task) => {
      return matchesFilter(task, filter);
    });

    if (visible.length === 0) {
      return (
        <div className="rounded-card bg-surface px-6 py-12 text-center shadow-card ring-1 ring-line">
          <p className="text-sm text-ink-soft">
            {tasks.data.length === 0
              ? "No tasks yet. Add the first one above."
              : filter === "open"
                ? "Nothing left to do here."
                : "Nothing to show."}
          </p>
        </div>
      );
    }

    return (
      <ul className="divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
        {visible.map((task) => {
          return (
            <TaskRow
              key={task.id}
              task={task}
              locked={locked || busyId === task.id}
              onOpen={openTask}
              onToggleDone={handleToggleDone}
              onChangeStatus={handleChangeStatus}
              onDelete={setDeleting}
            />
          );
        })}
      </ul>
    );
  };

  const renderContent = () => {
    if (tasks.isPending) {
      return (
        <div role="status" className="flex justify-center py-12 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (tasks.isError) {
      return (
        <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
          <p className="mb-4 text-sm text-ink-soft">{tasks.error.message}</p>
          <Button variant="secondary" onClick={tasks.refetch}>
            Try again
          </Button>
        </div>
      );
    }
    if (view === "board") {
      return (
        <TaskBoard
          workspaceId={workspaceId}
          project={project}
          tasks={tasks.data}
          locked={locked}
          onOpen={openTask}
        />
      );
    }

    return renderList();
  };

  const doneCount = (tasks.data ?? []).filter((task) => {
    return task.status === "done";
  }).length;
  const total = (tasks.data ?? []).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <TaskQuickAdd
          workspaceId={workspaceId}
          projectId={project.id}
          disabled={locked}
          className="min-w-64 flex-1"
        />

        <div
          role="group"
          aria-label="View"
          className="flex rounded-control border border-line bg-surface p-0.5"
        >
          {VIEWS.map((option) => {
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={view === option.id}
                onClick={() => {
                  changeView(option.id);
                }}
                className={cn(
                  "rounded-control px-3 py-2 text-sm transition-colors",
                  view === option.id
                    ? "bg-sunken font-medium text-ink"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {view === "list" && (
          <select
            aria-label="Show"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
            }}
            className="rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <option value="open">Open ({total - doneCount})</option>
            <option value="done">Done ({doneCount})</option>
            <option value="all">All ({total})</option>
          </select>
        )}
      </div>

      {locked && (
        <p className="text-sm text-ink-soft">
          This project is archived. Restore it to change its tasks.
        </p>
      )}

      {renderContent()}

      {selectedTask && (
        <TaskDrawer
          key={selectedTask.id}
          workspaceId={workspaceId}
          project={project}
          task={selectedTask}
          locked={locked}
          onClose={closeTask}
        />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
        }}
        title="Delete this task?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleting(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          &ldquo;{deleting?.title}&rdquo; will be removed for good. This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
};

export default ProjectTasks;
