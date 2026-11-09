import { TASK_STATUS_LABELS } from "./constants.js";

export const STATUS_KEYS = Object.keys(TASK_STATUS_LABELS);

const byPosition = (a, b) => {
  return a.position - b.position || a.id.localeCompare(b.id);
};

// { todo: [id, ...], in_progress: [...], ... }, each column in board order.
export const groupByStatus = (tasks) => {
  const columns = Object.fromEntries(
    STATUS_KEYS.map((key) => {
      return [key, []];
    }),
  );

  for (const task of [...tasks].sort(byPosition)) {
    columns[task.status].push(task.id);
  }

  return columns;
};

// `id` can be a card's id or a column's own key (when you hover over a column's empty area).
export const findColumn = (columns, id) => {
  if (STATUS_KEYS.includes(id)) {
    return id;
  }

  return STATUS_KEYS.find((key) => {
    return columns[key].includes(id);
  });
};

// While dragging: when the card is over another column (or a card in it), move it there.
export const moveBetweenColumns = (columns, activeId, overId, isBelowOver) => {
  const from = findColumn(columns, activeId);
  const to = findColumn(columns, overId);

  if (!from || !to || from === to) {
    return columns;
  }

  const target = columns[to];
  const overIndex = target.indexOf(overId);
  // overIndex is -1 when we're over the column itself, which means "at the end".
  const index = overIndex === -1 ? target.length : overIndex + (isBelowOver ? 1 : 0);

  return {
    ...columns,
    [from]: columns[from].filter((id) => {
      return id !== activeId;
    }),
    [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
  };
};

// On drop, inside one column: put the card where the card it was dropped on is.
export const reorderWithinColumn = (columns, activeId, overId) => {
  const column = findColumn(columns, activeId);

  // Dropped on the column's empty area, or on another column: nothing to reorder.
  if (!column || STATUS_KEYS.includes(overId) || column !== findColumn(columns, overId)) {
    return columns;
  }

  const items = columns[column];
  const oldIndex = items.indexOf(activeId);
  const newIndex = items.indexOf(overId);

  if (oldIndex === newIndex) {
    return columns;
  }

  const next = [...items];

  next.splice(oldIndex, 1);
  next.splice(newIndex, 0, activeId);

  return { ...columns, [column]: next };
};

// What the server needs to know: the column, and the card now directly above (or null).
export const describeDrop = (columns, taskId) => {
  const status = findColumn(columns, taskId);
  const index = columns[status].indexOf(taskId);

  return { status, afterTaskId: index === 0 ? null : columns[status][index - 1] };
};
