import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createInvoiceSchema,
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
router.post("/:invoiceId/void", invoicesController.voidInvoice);
router.delete("/:invoiceId", invoicesController.deleteInvoice);

export default router;
