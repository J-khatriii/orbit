export const STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
  partial: "Part paid",
};

// Badge tones: neutral, sage, clay, brand.
export const STATUS_TONES = {
  draft: "neutral",
  sent: "brand",
  paid: "sage",
  void: "neutral",
  overdue: "clay",
  partial: "brand",
};

// A sent invoice past its due date shows as "Overdue". One that has had a payment but is not
// paid in full shows as "Part paid".
export const displayStatus = (invoice) => {
  if (invoice.overdue) {
    return "overdue";
  }
  if (invoice.status === "sent" && invoice.amountPaidMinor > 0) {
    return "partial";
  }

  return invoice.status;
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

export const METHOD_LABELS = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
  online: "Online (Stripe)",
};

// What can be typed in by hand. "Online" is only ever recorded automatically from Stripe, so it
// isn't offered in the Record payment form.
export const PAYMENT_METHODS = Object.entries(METHOD_LABELS)
  .filter(([value]) => {
    return value !== "online";
  })
  .map(([value, label]) => {
    return { value, label };
  });
