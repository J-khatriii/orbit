import { z } from "zod";
import { UUID_PATTERN } from "./fields.js";

// The text fields that come with an upload. Multipart sends everything as text.
export const uploadFileSchema = z.object({
  projectId: z.string().regex(UUID_PATTERN, "Choose a project").optional(),
  clientVisible: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => {
      return value === "true";
    }),
});

export const listFilesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  projectId: z.string().regex(UUID_PATTERN, "Choose a project").optional(),
});

export const updateFileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name")
      .max(200, "Use at most 200 characters")
      .optional(),
    clientVisible: z.boolean().optional(),
    projectId: z.string().regex(UUID_PATTERN, "Choose a project").nullable().optional(),
  })
  .refine(
    (value) => {
      return Object.keys(value).length > 0;
    },
    { message: "Nothing to change" },
  );
