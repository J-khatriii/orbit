import { z } from "zod";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Forms send "" for an empty box. We store that as "nothing" (null).
const blankToNull = (value) => {
  return value === "" ? null : value;
};

const optionalText = (max) => {
  return z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .nullable()
    .optional()
    .transform(blankToNull);
};

const name = z.string().trim().min(1, "Enter a name").max(120, "Use at most 120 characters");

const optionalFields = {
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Use at most 254 characters")
    .refine((value) => {
      return value === "" || EMAIL_PATTERN.test(value);
    }, "Enter a valid email address")
    .nullable()
    .optional()
    .transform(blankToNull),
  phone: optionalText(40),
  jobTitle: optionalText(100),
  isPrimary: z.boolean({ message: "isPrimary must be true or false" }).optional(),
};

export const createContactSchema = z.object({ name, ...optionalFields }).strict();

export const updateContactSchema = z
  .object({ name: name.optional(), ...optionalFields })
  .strict()
  .refine((changes) => {
    return Object.values(changes).some((value) => {
      return value !== undefined;
    });
  }, "Nothing to update");
