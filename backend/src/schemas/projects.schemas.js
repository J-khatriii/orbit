import { z } from "zod";
import { blankToNull, optionalDate, UUID_PATTERN } from "./fields.js";

const STATUSES = ["planned", "active", "on_hold", "completed"];

const name = z
  .string()
  .trim()
  .min(1, "Enter a project name")
  .max(120, "Use at most 120 characters");

const clientId = z.string().regex(UUID_PATTERN, "Choose a client");

const optionalFields = {
  description: z
    .string()
    .trim()
    .max(5000, "Use at most 5000 characters")
    .nullable()
    .optional()
    .transform(blankToNull),
  status: z.enum(STATUSES, { message: "Choose a status" }).optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
  // Whole cents. 12,500.00 is sent as 1250000.
  budgetMinor: z
    .number({ message: "Budget must be a number" })
    .int("Budget must be a whole number of cents")
    .min(0, "Budget can't be negative")
    .max(1_000_000_000_000, "That budget is too large")
    .nullable()
    .optional(),
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
};

export const createProjectSchema = z.object({ clientId, name, ...optionalFields }).strict();

// A project's client can't be changed, so clientId isn't accepted here.
export const updateProjectSchema = z
  .object({ name: name.optional(), ...optionalFields })
  .strict()
  .refine((changes) => {
    return Object.values(changes).some((value) => {
      return value !== undefined;
    });
  }, "Nothing to update");

export const listProjectsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  clientId: z.string().regex(UUID_PATTERN, "Invalid client").optional(),
  status: z.enum(STATUSES).optional(),
  view: z.enum(["active", "archived", "all"]).default("active"),
  sort: z.enum(["name", "created", "due"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const addProjectMemberSchema = z
  .object({
    userId: z.string().regex(UUID_PATTERN, "Choose a person"),
    role: z.enum(["lead", "member"], { message: "Choose a role" }).optional(),
  })
  .strict();
