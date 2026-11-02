import { emailProblem } from "../auth/validation.js";

export const validateInvite = ({ email, role }) => {
  const errors = {};
  const emailMessage = emailProblem(email);

  if (emailMessage) {
    errors.email = emailMessage;
  }
  if (!role) {
    errors.role = "Choose a role";
  }

  return errors;
};
