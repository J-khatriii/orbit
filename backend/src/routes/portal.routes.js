import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createPortalMessageSchema, listMessagesSchema } from "../schemas/messages.schemas.js";
import * as portalController from "../controllers/portal.controller.js";

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

export default router;
