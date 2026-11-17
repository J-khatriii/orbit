import { z } from "zod";
import { MAX_AMOUNT_MINOR, parseQuantityMilli } from "../lib/money.js";
import { UUID_PATTERN } from "./fields.js";

const uuid = (message) => {
  return z.string().regex(UUID_PATTERN, message);
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Enter a real date");

const currency = z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, like USD");

const taxRateBps = z
  .number()
  .int("Use a whole number of basis points")
  .min(0, "The tax rate can't be negative")
  .max(10000, "The tax rate can't be above 100%");

const notes = z
  .string()
  .trim()
  .max(2000, "Use at most 2000 characters")
  .transform((value) => {
    return value === "" ? null : value;
  })
  .nullable();

// One invoice line. The quantity may be text or a number; either way it ends up as whole
// thousandths. Prices are whole minor units (cents).
const itemSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, "Enter a description")
      .max(500, "Use at most 500 characters"),
    quantity: z.union([z.string(), z.number()]).refine((value) => {
      return parseQuantityMilli(value) !== null;
    }, "Use a number from 0.001 to 1,000,000, with up to 3 decimals"),
    unitPriceMinor: z
      .number()
      .int("Use a whole number of cents")
      .min(0, "The price can't be negative")
      .max(MAX_AMOUNT_MINOR, "That amount is too large"),
  })
  .transform((item) => {
    return {
      description: item.description,
      quantityMilli: parseQuantityMilli(item.quantity),
      unitPriceMinor: item.unitPriceMinor,
    };
  });

const items = z.array(itemSchema).max(100, "Use at most 100 lines");

export const createInvoiceSchema = z
  .object({
    clientId: uuid("Choose a client"),
    projectId: uuid("Choose a project").nullable().optional(),
    currency,
    issueDate: isoDate,
    dueDate: isoDate,
    taxRateBps: taxRateBps.default(0),
    notes: notes.optional(),
    items: items.default([]),
  })
  .refine(
    (value) => {
      return value.dueDate >= value.issueDate;
    },
    { path: ["dueDate"], message: "The due date can't be before the issue date" },
  );

export const updateInvoiceSchema = z
  .object({
    clientId: uuid("Choose a client").optional(),
    projectId: uuid("Choose a project").nullable().optional(),
    currency: currency.optional(),
    issueDate: isoDate.optional(),
    dueDate: isoDate.optional(),
    taxRateBps: taxRateBps.optional(),
    notes: notes.optional(),
    items: items.optional(),
  })
  .refine(
    (value) => {
      return Object.keys(value).length > 0;
    },
    { message: "Nothing to change" },
  );

export const listInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  clientId: uuid("Choose a client").optional(),
  status: z.enum(["draft", "sent", "paid", "void", "overdue"]).optional(),
});

export const portalListInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  clientId: uuid("Choose a client").optional(),
});
