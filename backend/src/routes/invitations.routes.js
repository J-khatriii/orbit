import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { validate } from "../middleware/validate.js";
import { acceptInvitationSchema, previewInvitationSchema } from "../schemas/invitations.schemas.js";
import * as invitationsController from "../controllers/invitations.controller.js";

const router = Router();

// Public: the person opening the email link may not have an account yet.
router.post("/preview", validate(previewInvitationSchema), invitationsController.previewInvitation);
router.post(
  "/accept",
  optionalAuth,
  validate(acceptInvitationSchema),
  invitationsController.acceptInvitation,
);

export default router;
