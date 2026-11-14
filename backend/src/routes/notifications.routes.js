import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { listNotificationsSchema, markReadSchema } from "../schemas/notifications.schemas.js";
import * as notificationsController from "../controllers/notifications.controller.js";

// Mounted under /workspaces/:workspaceId/notifications. Every role has its own notifications,
// so the mount checks the workspace and nothing more.
const router = Router({ mergeParams: true });

router.get(
  "/",
  validate(listNotificationsSchema, "query"),
  notificationsController.listNotifications,
);
router.get("/unread-count", notificationsController.getUnreadCount);
router.post("/read", validate(markReadSchema), notificationsController.markRead);

export default router;
