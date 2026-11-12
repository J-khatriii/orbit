import { Router } from "express";
import * as portalController from "../controllers/portal.controller.js";

// Mounted under /workspaces/:workspaceId/portal. The mount has already checked the
// workspace and that the person's role is "client".
const router = Router({ mergeParams: true });

router.get("/projects", portalController.listProjects);
router.get("/projects/:projectId", portalController.getProject);

export default router;
