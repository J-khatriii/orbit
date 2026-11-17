import {
  bpsToPercent,
  lineTotal,
  minorToInput,
  parseMoneyInput,
  parseQuantityMilli,
  percentToBps,
  taxAmount,
} from "../../lib/money.js";

const pad = (number) => {
  return String(number).padStart(2, "0");
};

// Today in the person's own timezone, as YYYY-MM-DD.
export const todayISO = () => {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const addDaysISO = (iso, days) => {
  const date = new Date(`${iso}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

export const emptyLine = () => {
  return { key: crypto.randomUUID(), description: "", quantity: "1", price: "" };
};

// A new invoice: today, due in 14 days, one empty line.
export const blankInvoice = ({ clientId = "", currency = "USD" } = {}) => {
  const today = todayISO();

  return {
    clientId,
    projectId: "",
    currency,
    issueDate: today,
    dueDate: addDaysISO(today, 14),
    taxPercent: "0",
    notes: "",
    items: [emptyLine()],
  };
};

// The form's values from a saved invoice.
export const valuesOf = (invoice) => {
  const items = invoice.items.map((item) => {
    return {
      key: item.id,
      description: item.description,
      quantity: item.quantity,
      price: minorToInput(item.unitPriceMinor, invoice.currency),
    };
  });

  return {
    clientId: invoice.clientId,
    projectId: invoice.projectId ?? "",
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    taxPercent: bpsToPercent(invoice.taxRateBps),
    notes: invoice.notes ?? "",
    items: items.length > 0 ? items : [emptyLine()],
  };
};

// A line with nothing typed in it is just an empty row, not a mistake.
const isBlank = (line) => {
  return line.description.trim() === "" && line.price.trim() === "";
};

const usedLines = (values) => {
  return values.items.filter((line) => {
    return !isBlank(line);
  });
};

// Problems with the form, ready to show: { ok, fields, lines }. `lines` is keyed by the
// line's key and holds { description, quantity, price }.
export const validate = (values) => {
  const fields = {};
  const lines = {};

  if (!values.clientId) {
    fields.clientId = "Choose a client";
  }
  if (!/^[A-Z]{3}$/.test(values.currency)) {
    fields.currency = "Use a 3-letter code, like USD";
  }
  if (!values.issueDate) {
    fields.issueDate = "Choose an issue date";
  }
  if (!values.dueDate) {
    fields.dueDate = "Choose a due date";
  } else if (values.issueDate && values.dueDate < values.issueDate) {
    fields.dueDate = "The due date can't be before the issue date";
  }
  if (values.taxPercent.trim() !== "" && percentToBps(values.taxPercent) === null) {
    fields.taxPercent = "Use a number from 0 to 100, with up to 2 decimals";
  }

  usedLines(values).forEach((line) => {
    const problems = {};

    if (line.description.trim() === "") {
      problems.description = "Enter a description";
    }
    if (parseQuantityMilli(line.quantity) === null) {
      problems.quantity = "Use a number, like 1 or 2.5";
    }
    if (parseMoneyInput(line.price, values.currency) === null) {
      problems.price = "Enter a price, like 50.00";
    }
    if (Object.keys(problems).length > 0) {
      lines[line.key] = problems;
    }
  });

  return {
    ok: Object.keys(fields).length === 0 && Object.keys(lines).length === 0,
    fields,
    lines,
  };
};

// The live totals shown while editing: { lineTotals: { [key]: minor | null }, subtotal, tax,
// total }. A line that isn't valid yet shows null and adds nothing.
export const totalsOf = (values) => {
  const lineTotals = {};
  let subtotal = 0;

  usedLines(values).forEach((line) => {
    const quantity = parseQuantityMilli(line.quantity);
    const price = parseMoneyInput(line.price, values.currency);
    const amount = quantity === null || price === null ? null : lineTotal(quantity, price);

    lineTotals[line.key] = amount;
    subtotal += amount ?? 0;
  });

  const tax = taxAmount(subtotal, percentToBps(values.taxPercent || "0") ?? 0);

  return { lineTotals, subtotal, tax, total: subtotal + tax };
};

// What the API wants. Call this only after validate() says ok.
export const inputOf = (values) => {
  return {
    clientId: values.clientId,
    projectId: values.projectId || null,
    currency: values.currency,
    issueDate: values.issueDate,
    dueDate: values.dueDate,
    taxRateBps: percentToBps(values.taxPercent || "0"),
    notes: values.notes.trim() || null,
    items: usedLines(values).map((line) => {
      return {
        description: line.description.trim(),
        quantity: line.quantity.trim(),
        unitPriceMinor: parseMoneyInput(line.price, values.currency),
      };
    }),
  };
};
