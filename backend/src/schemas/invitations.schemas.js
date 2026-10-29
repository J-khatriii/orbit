import { z } from "zod";
import { emailRule, newPasswordRule, tokenRule } from "./auth.schemas.js";

// "owner" is deliberately not in this list.
export const createInvitationSchema = z
  .object({
    email: emailRule,
    role: z.enum(["admin", "member", "client"], { message: "Choose a role" }),
  })
  .strict();

export const previewInvitationSchema = z.object({
  token: tokenRule,
});

// name and password are only needed by someone who has no account yet. The service
// decides whether they're required, because that depends on the invitation.
export const acceptInvitationSchema = z.object({
  token: tokenRule,
  name: z.string().trim().min(1, "Please enter your name").max(100).optional(),
  password: newPasswordRule.optional(),
});
