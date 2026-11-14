import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createPortalMessageSchema, listMessagesSchema } from "../schemas/messages.schemas.js";
import { reviewTaskSchema } from "../schemas/reviews.schemas.js";
import * as portalController from "../controllers/portal.controller.js";
import * as reviewsController from "../controllers/reviews.controller.js";

// Mounted under /workspaces/:workspaceId/portal. The mount has already checked the
// workspace and that the person's role is "client".
const router = Router({ mergeParams: true });

router.get("/projects", portalController.listProjects);
router.get("/projects/:projectId", portalController.getProject);

router.get("/clients", portalController.listClients);
router.get(
  "/clients/:clientId/messages",
  validate(listMessagesSchema, "query"),
  portalController.listClientMessages,
);
router.post(
  "/clients/:clientId/messages",
  validate(createPortalMessageSchema),
  portalController.createClientMessage,
);

router.post("/tasks/:taskId/review", validate(reviewTaskSchema), reviewsController.reviewTask);

export default router;
