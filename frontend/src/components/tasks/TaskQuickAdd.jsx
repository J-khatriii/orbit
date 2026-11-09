import { useState } from "react";
import { Button, useToast } from "../ui/index.js";
import { useCreateTask } from "../../features/tasks/useTaskMutations.js";

const TaskQuickAdd = ({ workspaceId, projectId, disabled, className = "" }) => {
  const toast = useToast();
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmed = title.trim();

    if (!trimmed) {
      setError("Enter a task title");
      return;
    }
    if (trimmed.length > 200) {
      setError("Use at most 200 characters");
      return;
    }

    setError("");
    create.mutate(
      { workspaceId, projectId, input: { title: trimmed } },
      {
        onSuccess: () => {
          setTitle("");
        },
        onError: (mutationError) => {
          toast.show(mutationError.message);
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={handleSubmit} className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          aria-label="New task title"
          placeholder={
            disabled ? "Restore this project to add tasks" : "Add a task and press Enter"
          }
          autoComplete="off"
          disabled={disabled}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
          className="min-w-0 flex-1 rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
        />
        <Button type="submit" loading={create.isPending} disabled={disabled}>
          Add
        </Button>
      </div>
      {error && <p className="mt-1.5 text-sm text-clay-600">{error}</p>}
    </form>
  );
};

export default TaskQuickAdd;
