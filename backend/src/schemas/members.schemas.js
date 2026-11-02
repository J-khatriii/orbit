import { z } from "zod";

// "owner" is deliberately not allowed. Ownership can't be handed out.
export const changeMemberRoleSchema = z
  .object({
    role: z.enum(["admin", "member", "client"], { message: "Choose a role" }),
  })
  .strict();
