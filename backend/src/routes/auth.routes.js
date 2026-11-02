import { Router } from "express";
import {
  emailLimiter,
  loginLimiter,
  signupLimiter,
  tokenLimiter,
} from "../middleware/authRateLimits.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "../schemas/auth.schemas.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

// Limiters run first, so a blocked request costs us almost nothing.
router.post("/signup", signupLimiter, validate(signupSchema), authController.signup);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.post("/verify-email", tokenLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post("/resend-verification", emailLimiter, requireAuth, authController.resendVerification);
router.post(
  "/forgot-password",
  emailLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  tokenLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;
