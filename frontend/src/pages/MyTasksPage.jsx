import { useState } from "react";
import MyTaskRow from "../components/tasks/MyTaskRow.jsx";
import { Button, Card, Spinner, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { groupByDue } from "../features/tasks/grouping.js";
import { useUpdateTask } from "../features/tasks/useTaskMutations.js";
import { useMyTasks } from "../features/tasks/useMyTasks.js";
import { cn } from "../lib/cn.js";

const VIEWS = [
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
];

const MyTasksPage = () => {
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;
  const canSee = activeWorkspace?.role !== "client";
  const [view, setView] = useState("open");
  const tasks = useMyTasks(workspaceId, view, canSee);
  const update = useUpdateTask();
  const busyId = update.isPending ? update.variables.taskId : null;
  const data = tasks.data;

  const handleToggleDone = (task) => {
    update.mutate(
      {
        workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        input: { status: task.status === "done" ? "todo" : "done" },
      },
      {
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  if (!canSee) {
    return (
      <Card title="My tasks">
        <p className="text-sm text-ink-soft">
          Task lists are only available to people who work in this workspace.
        </p>
      </Card>
    );
  }

  const renderContent = () => {
    if (tasks.isPending) {
      return (
        <div role="status" className="flex justify-center py-16 text-ink-muted">
          <Spinner className="size-6" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (tasks.isError) {
      return (
        <Card title="We couldn't load your tasks">
          <p className="mb-4 text-sm text-ink-soft">{tasks.error.message}</p>
          <Button variant="secondary" onClick={tasks.refetch}>
            Try again
          </Button>
        </Card>
      );
    }
    if (data.tasks.length === 0) {
      return (
        <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
          <h2 className="font-display text-2xl text-ink">
            {view === "open" ? "You're all caught up." : "Nothing finished yet."}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            {view === "open"
              ? "Tasks assigned to you, in any project, will show up here."
              : "Tasks you finish will be listed here."}
          </p>
        </div>
      );
    }

    const groups =
      view === "open"
        ? groupByDue(data.tasks)
        : [{ id: "done", label: "Recently completed", tasks: data.tasks }];

    return (
      <div className="space-y-6">
        {groups.map((group) => {
          return (
            <section key={group.id} aria-label={group.label}>
              <h2
                className={cn(
                  "mb-2 text-sm font-medium",
                  group.id === "overdue" ? "text-clay-700" : "text-ink",
                )}
              >
                {group.label}{" "}
                <span className="font-normal text-ink-muted">{group.tasks.length}</span>
              </h2>
              <ul className="divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
                {group.tasks.map((task) => {
                  return (
                    <MyTaskRow
                      key={task.id}
                      task={task}
                      busy={busyId === task.id}
                      onToggleDone={handleToggleDone}
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
        {data.meta.total > data.tasks.length && (
          <p className="text-sm text-ink-muted">
            Showing the first {data.tasks.length} of {data.meta.total}.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">My tasks</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data
              ? `${data.meta.total} ${view === "open" ? "open" : "finished"} ${
                  data.meta.total === 1 ? "task" : "tasks"
                }`
              : "\u00a0"}
          </p>
        </div>

        <div
          role="group"
          aria-label="Show"
          className="flex rounded-control border border-line bg-surface p-0.5"
        >
          {VIEWS.map((option) => {
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={view === option.id}
                onClick={() => {
                  setView(option.id);
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
      </div>

      {renderContent()}
    </div>
  );
};

export default MyTasksPage;
