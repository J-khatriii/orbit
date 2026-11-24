import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createInvoiceSchema,
  createPaymentSchema,
  listInvoicesSchema,
  updateInvoiceSchema,
} from "../schemas/invoices.schemas.js";
import * as invoicesController from "../controllers/invoices.controller.js";

// Mounted under /workspaces/:workspaceId/invoices. The mount has already checked the
// workspace and the role (owners and admins only).
const router = Router({ mergeParams: true });

router.get("/", validate(listInvoicesSchema, "query"), invoicesController.listInvoices);
router.post("/", validate(createInvoiceSchema), invoicesController.createInvoice);
router.get("/:invoiceId", invoicesController.getInvoice);
router.patch("/:invoiceId", validate(updateInvoiceSchema), invoicesController.updateInvoice);
router.post("/:invoiceId/send", invoicesController.sendInvoice);
router.post("/:invoiceId/email", invoicesController.emailInvoice);
router.post("/:invoiceId/void", invoicesController.voidInvoice);
router.post(
  "/:invoiceId/payments",
  validate(createPaymentSchema),
  invoicesController.recordPayment,
);
router.delete("/:invoiceId/payments/:paymentId", invoicesController.deletePayment);
router.delete("/:invoiceId", invoicesController.deleteInvoice);
router.get("/:invoiceId/pdf", invoicesController.downloadPdf);

export default router;
