import { z } from "zod";

const isValidTimezone = (value) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });

    return true;
  } catch {
    return false;
  }
};

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2, "Give your workspace a name").max(60).optional(),
    brandColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #2b4bd3")
      .transform((value) => {
        return value.toLowerCase();
      })
      .optional(),
    defaultCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code like USD")
      .optional(),
    timezone: z.string().trim().refine(isValidTimezone, "Unknown timezone").optional(),
  })
  .strict()
  .refine(
    (data) => {
      return Object.keys(data).length > 0;
    },
    { message: "Send at least one field to change" },
  );
