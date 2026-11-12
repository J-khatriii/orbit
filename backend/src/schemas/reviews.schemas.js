import { z } from "zod";

export const reviewTaskSchema = z.object({
  decision: z.enum(["approved", "changes_requested"], {
    message: "Choose approve or request changes",
  }),
  comment: z.string().trim().max(2000, "Use at most 2000 characters").optional(),
});
