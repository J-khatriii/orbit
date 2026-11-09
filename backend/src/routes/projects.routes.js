import { Router } from "express";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  addProjectMemberSchema,
  createProjectSchema,
  listProjectsSchema,
  updateProjectSchema,
} from "../schemas/projects.schemas.js";
import * as projectsController from "../controllers/projects.controller.js";
import { listActivitySchema } from "../schemas/activity.schemas.js";
import tasksRoutes from "./tasks.routes.js";
import { saveAsTemplateSchema } from "../schemas/templates.schemas.js";

// Mounted under /workspaces/:workspaceId/projects. By the time a request gets here,
// workspaceContext has checked the workspace and role (owner, admin or member).
const router = Router();

router.get("/", validate(listProjectsSchema, "query"), projectsController.listProjects);
router.post("/", validate(createProjectSchema), projectsController.createProject);
router.get("/:projectId", projectsController.getProject);
router.get(
  "/:projectId/activity",
  validate(listActivitySchema, "query"),
  projectsController.listProjectActivity,
);
router.patch("/:projectId", validate(updateProjectSchema), projectsController.updateProject);

// Hiding a project from the whole team is an owner/admin decision.
router.post(
  "/:projectId/archive",
  requireRole("owner", "admin"),
  projectsController.archiveProject,
);
router.post(
  "/:projectId/restore",
  requireRole("owner", "admin"),
  projectsController.restoreProject,
);

// Copies the project's task list into a new template.
router.post(
  "/:projectId/save-as-template",
  requireRole("owner", "admin"),
  validate(saveAsTemplateSchema),
  projectsController.saveAsTemplate,
);

router.post("/:projectId/members", validate(addProjectMemberSchema), projectsController.addMember);
router.delete("/:projectId/members/:userId", projectsController.removeMember);
router.use("/:projectId/tasks", tasksRoutes);

export default router;
