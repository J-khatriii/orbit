import { z } from "zod";
import { blankToNull } from "./fields.js";
import { TASK_PRIORITIES } from "./tasks.schemas.js";

const MAX_TASKS = 100;

const name = z
  .string()
  .trim()
  .min(1, "Enter a template name")
  .max(120, "Use at most 120 characters");

const description = z
  .string()
  .trim()
  .max(5000, "Use at most 5000 characters")
  .nullable()
  .optional()
  .transform(blankToNull);

const templateTask = z
  .object({
    title: z.string().trim().min(1, "Enter a task title").max(200, "Use at most 200 characters"),
    description,
    priority: z.enum(TASK_PRIORITIES, { message: "Choose a priority" }).optional(),
    dueOffsetDays: z
      .number({ message: "Use a whole number of days" })
      .int("Use a whole number of days")
      .min(0, "Days can't be negative")
      .max(3650, "That is too many days")
      .nullable()
      .optional(),
  })
  .strict();

const tasks = z
  .array(templateTask)
  .max(MAX_TASKS, `A template can have at most ${MAX_TASKS} tasks`);

export const createTemplateSchema = z
  .object({ name, description, tasks: tasks.optional() })
  .strict();

// Sending `tasks` replaces the whole list. Leaving it out keeps the tasks as they are.
export const updateTemplateSchema = z
  .object({ name: name.optional(), description, tasks: tasks.optional() })
  .strict()
  .refine((changes) => {
    return Object.values(changes).some((value) => {
      return value !== undefined;
    });
  }, "Nothing to update");

export const saveAsTemplateSchema = z.object({ name, description }).strict();
