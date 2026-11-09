// Form values for a template. Numbers and empty boxes are text, because inputs hold text.
// Each task row gets a `key` so rows keep their place when reordered.
export const valuesOf = (template) => {
  return {
    name: template?.name ?? "",
    description: template?.description ?? "",
    tasks: (template?.tasks ?? []).map((task) => {
      return {
        key: task.id,
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        dueOffsetDays: task.dueOffsetDays === null ? "" : String(task.dueOffsetDays),
      };
    }),
  };
};

export const newTaskRow = () => {
  return {
    key: crypto.randomUUID(),
    title: "",
    description: "",
    priority: "medium",
    dueOffsetDays: "",
  };
};

// The body for the server. Sending `tasks` replaces the template's whole list.
export const toInput = (values) => {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    tasks: values.tasks.map((task) => {
      const days = task.dueOffsetDays.trim();

      return {
        title: task.title.trim(),
        description: task.description.trim(),
        priority: task.priority,
        dueOffsetDays: days === "" ? null : Number(days),
      };
    }),
  };
};

export const MAX_TASKS = 100;

// Quick feedback in the browser. The server checks everything again.
// Problems with a task row are collected under `rows`, by the row's key.
export const validateTemplateForm = (values) => {
  const errors = {};
  const name = values.name.trim();

  if (!name) {
    errors.name = "Enter a template name";
  } else if (name.length > 120) {
    errors.name = "Use at most 120 characters";
  }
  if (values.description.trim().length > 5000) {
    errors.description = "Use at most 5000 characters";
  }
  if (values.tasks.length > MAX_TASKS) {
    errors.tasks = `A template can have at most ${MAX_TASKS} tasks`;
  }

  const rows = {};

  for (const task of values.tasks) {
    const problems = {};
    const title = task.title.trim();
    const days = task.dueOffsetDays.trim();

    if (!title) {
      problems.title = "Enter a task title";
    } else if (title.length > 200) {
      problems.title = "Use at most 200 characters";
    }
    if (days !== "" && !/^\d+$/.test(days)) {
      problems.dueOffsetDays = "Use a whole number of days";
    } else if (Number(days) > 3650) {
      problems.dueOffsetDays = "Use at most 3650";
    }
    if (task.description.trim().length > 5000) {
      problems.description = "Use at most 5000 characters";
    }
    if (Object.keys(problems).length > 0) {
      rows[task.key] = problems;
    }
  }
  if (Object.keys(rows).length > 0) {
    errors.rows = rows;
  }

  return errors;
};
