import { HEX_PATTERN } from "../../lib/color.js";

export const validateWorkspaceBasics = ({ name, brandColor }) => {
  const errors = {};

  if (name.trim().length < 2) {
    errors.name = "Give your workspace a name";
  }
  if (!HEX_PATTERN.test(brandColor)) {
    errors.brandColor = "Pick a colour";
  }

  return errors;
};

export const validateWorkspaceDetails = ({ defaultCurrency, timezone }) => {
  const errors = {};

  if (!/^[A-Za-z]{3}$/.test(defaultCurrency)) {
    errors.defaultCurrency = "Choose a currency";
  }
  if (!timezone) {
    errors.timezone = "Choose a timezone";
  }

  return errors;
};
