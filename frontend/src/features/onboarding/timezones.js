export const detectTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// Every timezone this browser knows, with UTC and the detected one guaranteed to be present
export const getTimezones = () => {
  const supported =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

  return [...new Set(["UTC", detectTimezone(), ...supported])].sort();
};
