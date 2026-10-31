const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailProblem = (email) => {
  const value = email.trim();

  if (!value) {
    return "Enter your email";
  }
  if (!EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address";
  }

  return "";
};

export const newPasswordProblem = (password) => {
  if (!password) {
    return "Choose a password";
  }
  if (password.length < 10) {
    return "Use at least 10 characters";
  }
  if (password.length > 128) {
    return "Use at most 128 characters";
  }

  return "";
};

const collect = (checks) => {
  const errors = {};

  for (const [field, message] of Object.entries(checks)) {
    if (message) {
      errors[field] = message;
    }
  }

  return errors;
};

export const validateLogin = ({ email, password }) => {
  return collect({
    email: emailProblem(email),
    password: password ? "" : "Enter your password",
  });
};

export const validateSignup = ({ name, workspaceName, email, password }) => {
  return collect({
    name: name.trim() ? "" : "Please enter your name",
    workspaceName: workspaceName.trim().length >= 2 ? "" : "Give your workspace a name",
    email: emailProblem(email),
    password: newPasswordProblem(password),
  });
};

export const validateForgotPassword = ({ email }) => {
  return collect({ email: emailProblem(email) });
};

export const validateResetPassword = ({ password, confirmPassword }) => {
  return collect({
    password: newPasswordProblem(password),
    confirmPassword: confirmPassword === password ? "" : "The passwords don't match",
  });
};
