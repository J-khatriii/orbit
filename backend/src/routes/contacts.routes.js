import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createContactSchema, updateContactSchema } from "../schemas/contacts.schemas.js";
import * as contactsController from "../controllers/contacts.controller.js";

// Mounted under /workspaces/:workspaceId/clients/:clientId/contacts.
// mergeParams lets these handlers see :clientId from the parent path.
const router = Router({ mergeParams: true });

router.get("/", contactsController.listContacts);
router.post("/", validate(createContactSchema), contactsController.createContact);
router.patch("/:contactId", validate(updateContactSchema), contactsController.updateContact);
router.delete("/:contactId", contactsController.deleteContact);

export default router;
