import { emailProblem } from "../auth/validation.js";

// "design, Retainer ,," becomes ["design", "Retainer"]. The server tidies the case.
export const parseTags = (text) => {
  return text
    .split(",")
    .map((tag) => {
      return tag.trim();
    })
    .filter(Boolean);
};

// Quick feedback in the browser. The server checks everything again.
export const validateClientForm = ({ companyName, billingEmail, currency, tags }) => {
  const errors = {};
  const name = companyName.trim();
  const tagList = parseTags(tags);

  if (!name) {
    errors.companyName = "Enter the company name";
  } else if (name.length > 120) {
    errors.companyName = "Use at most 120 characters";
  }
  if (billingEmail.trim()) {
    const problem = emailProblem(billingEmail);

    if (problem) {
      errors.billingEmail = problem;
    }
  }
  if (currency.trim() && !/^[A-Za-z]{3}$/.test(currency.trim())) {
    errors.currency = "Use a 3-letter code like USD";
  }
  if (tagList.length > 20) {
    errors.tags = "Use at most 20 tags";
  } else if (
    tagList.some((tag) => {
      return tag.length > 30;
    })
  ) {
    errors.tags = "Tags can be up to 30 characters";
  }

  return errors;
};
