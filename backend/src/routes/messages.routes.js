import { Router } from "express";
import { discardUpload, uploadFiles } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { createMessageSchema, listMessagesSchema } from "../schemas/messages.schemas.js";
import * as messagesController from "../controllers/messages.controller.js";

// Mounted under /workspaces/:workspaceId/clients/:clientId/messages. The mount has already
// checked the workspace and the role (the team only).
const router = Router({ mergeParams: true });

router.get("/", validate(listMessagesSchema, "query"), messagesController.listMessages);
router.post("/", uploadFiles, validate(createMessageSchema), messagesController.createMessage);

// Last: cleans up waiting uploads if anything above failed.
router.use(discardUpload);

export default router;
