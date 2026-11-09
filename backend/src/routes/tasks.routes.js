import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createTaskSchema,
  listTasksSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "../schemas/tasks.schemas.js";
import * as tasksController from "../controllers/tasks.controller.js";

// Mounted under /workspaces/:workspaceId/projects/:projectId/tasks. The projects mount has
// already checked the workspace and the role. mergeParams lets us read :projectId.
const router = Router({ mergeParams: true });

router.get("/", validate(listTasksSchema, "query"), tasksController.listTasks);
router.post("/", validate(createTaskSchema), tasksController.createTask);
router.get("/:taskId", tasksController.getTask);
router.patch("/:taskId", validate(updateTaskSchema), tasksController.updateTask);
router.post("/:taskId/move", validate(moveTaskSchema), tasksController.moveTask);
router.delete("/:taskId", tasksController.deleteTask);

export default router;
