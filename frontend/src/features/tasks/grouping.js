const dayKey = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

// Splits tasks (already sorted soonest-due first) into the sections people think in.
// Due dates are "YYYY-MM-DD" text, so comparing them as text compares them as dates.
// Empty sections are left out.
export const groupByDue = (tasks, now = new Date()) => {
  const today = dayKey(now);
  const weekEnd = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const groups = [
    { id: "overdue", label: "Overdue", tasks: [] },
    { id: "today", label: "Today", tasks: [] },
    { id: "week", label: "Next 7 days", tasks: [] },
    { id: "later", label: "Later", tasks: [] },
    { id: "none", label: "No due date", tasks: [] },
  ];

  for (const task of tasks) {
    let index = 4;

    if (task.dueDate) {
      if (task.dueDate < today) {
        index = 0;
      } else if (task.dueDate === today) {
        index = 1;
      } else if (task.dueDate <= weekEnd) {
        index = 2;
      } else {
        index = 3;
      }
    }

    groups[index].tasks.push(task);
  }

  return groups.filter((group) => {
    return group.tasks.length > 0;
  });
};
