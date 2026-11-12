import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createMessageSchema, listMessagesSchema } from "../schemas/messages.schemas.js";
import * as messagesController from "../controllers/messages.controller.js";

// Mounted under /workspaces/:workspaceId/clients/:clientId/messages. The mount has already
// checked the workspace and the role (the team only).
const router = Router({ mergeParams: true });

router.get("/", validate(listMessagesSchema, "query"), messagesController.listMessages);
router.post("/", validate(createMessageSchema), messagesController.createMessage);

export default router;
