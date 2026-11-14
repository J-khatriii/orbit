import { z } from "zod";
import { UUID_PATTERN } from "./fields.js";

export const listNotificationsSchema = z.object({
  view: z.enum(["all", "unread"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// Either some notifications by id, or all of them.
export const markReadSchema = z
  .object({
    ids: z.array(z.string().regex(UUID_PATTERN)).min(1).max(100).optional(),
    all: z.boolean().optional(),
  })
  .refine(
    (value) => {
      return Boolean(value.ids) || value.all === true;
    },
    { message: "Choose notifications to mark as read" },
  );
