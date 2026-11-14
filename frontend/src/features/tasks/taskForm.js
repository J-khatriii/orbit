const TEXT_FIELDS = ["title", "status", "priority", "assigneeId", "dueDate", "description"];
const FIELDS = [...TEXT_FIELDS, "clientVisible"];

// Form values for a task. Empty boxes are "" because inputs can't hold null.
export const valuesOf = (task) => {
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? "",
    dueDate: task.dueDate ?? "",
    description: task.description ?? "",
    clientVisible: task.clientVisible ?? false,
  };
};

export const changedFields = (values, initial) => {
  return FIELDS.filter((field) => {
    if (field === "clientVisible") {
      return values.clientVisible !== initial.clientVisible;
    }

    return values[field].trim() !== initial[field].trim();
  });
};

// The body for the PATCH: only what the person actually changed. That way, saving never
// overwrites something that changed elsewhere in the meantime (like a card dragged to Done).
export const toInput = (values, initial) => {
  return Object.fromEntries(
    changedFields(values, initial).map((field) => {
      return [field, field === "clientVisible" ? values[field] : values[field].trim()];
    }),
  );
};

// Quick feedback in the browser. The server checks everything again.
export const validateTaskForm = (values) => {
  const errors = {};
  const title = values.title.trim();

  if (!title) {
    errors.title = "Enter a task title";
  } else if (title.length > 200) {
    errors.title = "Use at most 200 characters";
  }
  if (values.description.trim().length > 5000) {
    errors.description = "Use at most 5000 characters";
  }

  return errors;
};
