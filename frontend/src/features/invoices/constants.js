export const STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
};

// Badge tones: neutral, sage, clay, brand.
export const STATUS_TONES = {
  draft: "neutral",
  sent: "brand",
  paid: "sage",
  void: "neutral",
  overdue: "clay",
};

// A sent invoice past its due date shows as "Overdue".
export const displayStatus = (invoice) => {
  return invoice.overdue ? "overdue" : invoice.status;
};

// The filters on the list page.
export const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];
