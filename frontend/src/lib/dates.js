// "2026-11-10" -> a date at local midnight. (new Date("2026-11-10") would be midnight UTC,
// which can show as the day before.)
export const parseDay = (value) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

export const formatDay = (value) => {
  return parseDay(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Past its due date and not finished.
export const isOverdue = (dueDate, status) => {
  if (!dueDate || status === "completed") {
    return false;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return parseDay(dueDate) < today;
};
