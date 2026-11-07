export const PROJECT_STATUS_LABELS = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

// Badge colours from the UI kit.
export const PROJECT_STATUS_TONES = {
  planned: "neutral",
  active: "sage",
  on_hold: "clay",
  completed: "brand",
};

export const VIEW_LABELS = {
  active: "Current projects",
  archived: "Archived",
  all: "All projects",
};

export const SORT_OPTIONS = [
  { value: "name:asc", label: "Name A–Z", sort: "name", order: "asc" },
  { value: "name:desc", label: "Name Z–A", sort: "name", order: "desc" },
  { value: "due:asc", label: "Due soonest", sort: "due", order: "asc" },
  { value: "due:desc", label: "Due latest", sort: "due", order: "desc" },
  { value: "created:desc", label: "Newest first", sort: "created", order: "desc" },
];

export const PAGE_SIZE = 20;
