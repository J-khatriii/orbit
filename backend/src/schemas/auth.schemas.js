import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Enter a valid email address" }))
    .pipe(z.string().max(254)),
  password: z.string().min(10, "Use at least 10 characters").max(128, "Use at most 128 characters"),
  workspaceName: z.string().trim().min(2, "Give your workspace a name").max(60),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Enter a valid email address" }))
    .pipe(z.string().max(254)),
  password: z.string().min(1, "Enter your password").max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20, "This link is not valid").max(200, "This link is not valid"),
});
