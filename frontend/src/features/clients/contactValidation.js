import { emailProblem } from "../auth/validation.js";

// Quick feedback in the browser. The server checks everything again.
export const validateContactForm = ({ name, email, phone, jobTitle }) => {
  const errors = {};

  if (!name.trim()) {
    errors.name = "Enter a name";
  } else if (name.trim().length > 120) {
    errors.name = "Use at most 120 characters";
  }
  if (email.trim()) {
    const problem = emailProblem(email);

    if (problem) {
      errors.email = problem;
    }
  }
  if (phone.trim().length > 40) {
    errors.phone = "Use at most 40 characters";
  }
  if (jobTitle.trim().length > 100) {
    errors.jobTitle = "Use at most 100 characters";
  }

  return errors;
};
