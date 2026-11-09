const DAY_MS = 86_400_000;

const toMs = (day) => {
  const [year, month, date] = day.split("-").map(Number);

  return Date.UTC(year, month - 1, date);
};

// Whole days from one date to another. Negative if `to` is earlier.
export const daysBetween = (from, to) => {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
};

export const addDays = (day, count) => {
  return new Date(toMs(day) + count * DAY_MS).toISOString().slice(0, 10);
};

export const todayUtc = () => {
  return new Date().toISOString().slice(0, 10);
};
