import { parseMoney } from "../../lib/money.js";

// Quick feedback in the browser. The server checks everything again.
//   needsClient       true when adding a project and the client is picked in the form
//   fallbackCurrency  the workspace's default, used when the currency box is empty
export const validateProjectForm = (values, { needsClient, fallbackCurrency }) => {
  const errors = {};
  const name = values.name.trim();
  const currencyText = values.currency.trim();

  if (!name) {
    errors.name = "Enter a project name";
  } else if (name.length > 120) {
    errors.name = "Use at most 120 characters";
  }
  if (needsClient && !values.clientId) {
    errors.clientId = "Choose a client";
  }
  if (currencyText && !/^[A-Za-z]{3}$/.test(currencyText)) {
    errors.currency = "Use a 3-letter code like USD";
  }

  const money = parseMoney(values.budget, currencyText.toUpperCase() || fallbackCurrency || "USD");

  if (money.error) {
    errors.budget = money.error;
  }
  if (values.startDate && values.dueDate && values.dueDate < values.startDate) {
    errors.dueDate = "The due date can't be before the start date";
  }

  return errors;
};
