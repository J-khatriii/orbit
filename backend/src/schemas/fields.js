import { z } from "zod";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Forms send "" for an empty box. We store that as "nothing" (null).
export const blankToNull = (value) => {
  return value === "" ? null : value;
};

const isRealDate = (value) => {
  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const optionalDate = z
  .string()
  .trim()
  .refine((value) => {
    return value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && isRealDate(value));
  }, "Use a real date like 2026-12-31")
  .nullable()
  .optional()
  .transform(blankToNull);
