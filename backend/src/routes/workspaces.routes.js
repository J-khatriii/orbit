import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { workspaceContext } from "../middleware/workspaceContext.js";
import { updateWorkspaceSchema } from "../schemas/workspaces.schemas.js";
import * as workspacesController from "../controllers/workspaces.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/:workspaceId", workspaceContext, workspacesController.getWorkspace);

router.patch(
  "/:workspaceId",
  workspaceContext,
  requireRole("owner", "admin"),
  validate(updateWorkspaceSchema),
  workspacesController.updateWorkspace,
);

router.get(
  "/:workspaceId/members",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  workspacesController.listMembers,
);

export default router;
