// Dates arrive as "YYYY-MM-DD" text. Reading them piece by piece avoids time zone shifts.
export const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: "medium" });
};
