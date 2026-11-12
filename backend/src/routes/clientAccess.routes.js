import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { grantAccessSchema } from "../schemas/clientAccess.schemas.js";
import * as accessController from "../controllers/clientAccess.controller.js";

// Mounted under /workspaces/:workspaceId/clients/:clientId/access. The mount has already
// checked the workspace and the role (owners and admins only).
const router = Router({ mergeParams: true });

router.get("/", accessController.listAccess);
router.get("/candidates", accessController.listCandidates);
router.post("/", validate(grantAccessSchema), accessController.grantAccess);
router.delete("/:userId", accessController.revokeAccess);

export default router;
