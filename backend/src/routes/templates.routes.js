import { Router } from "express";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { createTemplateSchema, updateTemplateSchema } from "../schemas/templates.schemas.js";
import * as templatesController from "../controllers/templates.controller.js";

// Mounted under /workspaces/:workspaceId/templates. The team can read templates. Changing
// them is for owners and admins.
const router = Router();

router.get("/", templatesController.listTemplates);
router.get("/:templateId", templatesController.getTemplate);
router.post(
  "/",
  requireRole("owner", "admin"),
  validate(createTemplateSchema),
  templatesController.createTemplate,
);
router.patch(
  "/:templateId",
  requireRole("owner", "admin"),
  validate(updateTemplateSchema),
  templatesController.updateTemplate,
);
router.delete("/:templateId", requireRole("owner", "admin"), templatesController.deleteTemplate);

export default router;
