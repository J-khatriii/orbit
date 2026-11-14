import { Router } from "express";
import { requireRole } from "../middleware/requireRole.js";
import { discardUpload, uploadFile } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { listFilesSchema, updateFileSchema, uploadFileSchema } from "../schemas/files.schemas.js";
import * as filesController from "../controllers/files.controller.js";

// Mounted under /workspaces/:workspaceId/clients/:clientId/files. The mount has already
// checked the workspace and the role (the team only).
const router = Router({ mergeParams: true });

router.get("/", validate(listFilesSchema, "query"), filesController.listFiles);
router.post("/", uploadFile, validate(uploadFileSchema), filesController.uploadFile);
router.get("/:fileId/download", filesController.downloadFile);
router.patch("/:fileId", validate(updateFileSchema), filesController.updateFile);
router.delete("/:fileId", requireRole("owner", "admin"), filesController.deleteFile);

// Last: cleans up a waiting upload if anything above failed.
router.use(discardUpload);

export default router;
