import { z } from "zod";
import { blankToNull, optionalDate, UUID_PATTERN } from "./fields.js";

export const TASK_STATUSES = ["todo", "in_progress", "in_review", "done"];
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];

const title = z.string().trim().min(1, "Enter a task title").max(200, "Use at most 200 characters");

// "" and null both mean "nobody".
const assigneeId = z
  .string()
  .trim()
  .refine((value) => {
    return value === "" || UUID_PATTERN.test(value);
  }, "Choose someone from the team")
  .nullable()
  .optional()
  .transform(blankToNull);

const optionalFields = {
  description: z
    .string()
    .trim()
    .max(5000, "Use at most 5000 characters")
    .nullable()
    .optional()
    .transform(blankToNull),
  status: z.enum(TASK_STATUSES, { message: "Choose a status" }).optional(),
  priority: z.enum(TASK_PRIORITIES, { message: "Choose a priority" }).optional(),
  assigneeId,
  dueDate: optionalDate,
  clientVisible: z.boolean({ message: "Must be true or false" }).optional(),
};

export const createTaskSchema = z.object({ title, ...optionalFields }).strict();

export const updateTaskSchema = z
  .object({ title: title.optional(), ...optionalFields })
  .strict()
  .refine((changes) => {
    return Object.values(changes).some((value) => {
      return value !== undefined;
    });
  }, "Nothing to update");

export const listTasksSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  assigneeId: z.string().regex(UUID_PATTERN, "Invalid person").optional(),
});

export const moveTaskSchema = z
  .object({
    status: z.enum(TASK_STATUSES, { message: "Choose a column" }),
    // The task directly above the drop spot. null (or left out) means the top of the column.
    afterTaskId: z.string().regex(UUID_PATTERN, "Invalid task").nullable().optional(),
  })
  .strict();
