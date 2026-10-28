import { z } from "zod";

const emailRule = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email address" }))
  .pipe(z.string().max(254));

const newPasswordRule = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters");

const tokenRule = z.string().min(20, "This link is not valid").max(200, "This link is not valid");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: emailRule,
  password: newPasswordRule,
  workspaceName: z.string().trim().min(2, "Give your workspace a name").max(60),
});

// Login deliberately doesn't enforce the 10-character minimum. If you raise the rule
// later, existing users must still be able to sign in
export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, "Enter your password").max(128),
});

export const verifyEmailSchema = z.object({
  token: tokenRule,
});

export const forgotPasswordSchema = z.object({
  email: emailRule,
});

export const resetPasswordSchema = z.object({
  token: tokenRule,
  password: newPasswordRule,
});
