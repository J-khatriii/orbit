import { z } from "zod";

const STATUSES = ["lead", "active", "past"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const companyName = z
  .string()
  .trim()
  .min(1, "Enter the company name")
  .max(120, "Use at most 120 characters");

const optionalFields = {
  status: z.enum(STATUSES, { message: "Choose a status" }).optional(),
  billingEmail: z
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
  billingAddress: optionalText(500),
  taxId: optionalText(50),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => {
      return value === "" || /^[A-Z]{3}$/.test(value);
    }, "Use a 3-letter code like USD")
    .nullable()
    .optional()
    .transform(blankToNull),
  notesInternal: optionalText(5000),
  tags: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .min(1, "Tags can't be empty")
        .max(30, "Tags can be up to 30 characters"),
    )
    .max(20, "Use at most 20 tags")
    .transform((tags) => {
      return [...new Set(tags)];
    })
    .optional(),
};

export const createClientSchema = z.object({ companyName, ...optionalFields }).strict();

export const updateClientSchema = z
  .object({ companyName: companyName.optional(), ...optionalFields })
  .strict()
  .refine((changes) => {
    return Object.values(changes).some((value) => {
      return value !== undefined;
    });
  }, "Nothing to update");

export const listClientsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(STATUSES).optional(),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  view: z.enum(["active", "archived", "all"]).default("active"),
  sort: z.enum(["name", "created"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
