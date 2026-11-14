import { z } from "zod";
import { UUID_PATTERN } from "./fields.js";

export const grantAccessSchema = z.object({
  userId: z.string().regex(UUID_PATTERN, "Choose a person"),
});
