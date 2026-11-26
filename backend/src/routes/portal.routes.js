import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { portalListFilesSchema } from "../schemas/files.schemas.js";
import { createPortalMessageSchema, listMessagesSchema } from "../schemas/messages.schemas.js";
import { reviewTaskSchema } from "../schemas/reviews.schemas.js";
import * as portalController from "../controllers/portal.controller.js";
import * as reviewsController from "../controllers/reviews.controller.js";
import { discardUpload, uploadFiles } from "../middleware/upload.js";
import { portalListInvoicesSchema } from "../schemas/invoices.schemas.js";

// Mounted under /workspaces/:workspaceId/portal. The mount has already checked the
// workspace and that the person's role is "client".
const router = Router({ mergeParams: true });

router.get("/projects", portalController.listProjects);
router.get("/projects/:projectId", portalController.getProject);

router.get("/clients", portalController.listClients);
router.get(
  "/clients/:clientId/messages",
  validate(listMessagesSchema, "query"),
  portalController.listClientMessages,
);
router.post(
  "/clients/:clientId/messages",
  uploadFiles,
  validate(createPortalMessageSchema),
  portalController.createClientMessage,
);

router.get("/files", validate(portalListFilesSchema, "query"), portalController.listFiles);
router.get("/files/:fileId/download", portalController.downloadFile);

router.get("/invoices", validate(portalListInvoicesSchema, "query"), portalController.listInvoices);
router.get("/invoices/:invoiceId", portalController.getInvoice);
router.get("/invoices/:invoiceId/pdf", portalController.downloadInvoicePdf);
router.post("/invoices/:invoiceId/checkout", portalController.startCheckout);

router.post("/tasks/:taskId/review", validate(reviewTaskSchema), reviewsController.reviewTask);

// Last: cleans up waiting uploads if anything above failed.
router.use(discardUpload);

export default router;
