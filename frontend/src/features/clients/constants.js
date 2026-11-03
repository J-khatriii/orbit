export const STATUS_LABELS = { lead: "Lead", active: "Active", past: "Past" };

// Badge colours from the UI kit.
export const STATUS_TONES = { lead: "brand", active: "sage", past: "neutral" };

export const VIEW_LABELS = { active: "Current clients", archived: "Archived", all: "All clients" };

export const SORT_OPTIONS = [
  { value: "name:asc", label: "Name A–Z", sort: "name", order: "asc" },
  { value: "name:desc", label: "Name Z–A", sort: "name", order: "desc" },
  { value: "created:desc", label: "Newest first", sort: "created", order: "desc" },
  { value: "created:asc", label: "Oldest first", sort: "created", order: "asc" },
];

export const PAGE_SIZE = 20;
