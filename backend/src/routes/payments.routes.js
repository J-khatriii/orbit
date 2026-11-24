import { Router } from "express";
import * as paymentsController from "../controllers/payments.controller.js";

// Mounted under /workspaces/:workspaceId/payments. The mount has already checked the
// workspace and the role (owners only).
const router = Router({ mergeParams: true });

router.get("/stripe", paymentsController.getStripeStatus);
router.post("/stripe/connect", paymentsController.connectStripe);
router.delete("/stripe", paymentsController.disconnectStripe);

export default router;
