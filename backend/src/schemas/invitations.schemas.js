import { z } from "zod";
import { emailRule } from "./auth.schemas.js";

// "owner" is deliberately not in this list.
export const createInvitationSchema = z
  .object({
    email: emailRule,
    role: z.enum(["admin", "member", "client"], { message: "Choose a role" }),
  })
  .strict();
