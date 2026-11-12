import { z } from "zod";
import { UUID_PATTERN } from "./fields.js";

export const createMessageSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(5000, "Use at most 5000 characters"),
  internal: z.boolean().default(false),
  projectId: z.string().regex(UUID_PATTERN, "Choose a project").nullable().optional(),
});

export const listMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  projectId: z.string().regex(UUID_PATTERN, "Choose a project").optional(),
});
