import { Router } from "express";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  createClientSchema,
  listClientsSchema,
  updateClientSchema,
} from "../schemas/clients.schemas.js";
import * as clientsController from "../controllers/clients.controller.js";
import { listActivitySchema } from "../schemas/activity.schemas.js";
import contactsRoutes from "./contacts.routes.js";

// Mounted under /workspaces/:workspaceId/clients. By the time a request gets here,
// workspaceContext has checked the workspace and role (owner, admin or member).
const router = Router();

router.get("/", validate(listClientsSchema, "query"), clientsController.listClients);
// "/tags" must come before "/:clientId", or "tags" would be read as an id.
router.get("/tags", clientsController.listTags);
router.post("/", validate(createClientSchema), clientsController.createClient);
router.get("/:clientId", clientsController.getClient);
router.patch("/:clientId", validate(updateClientSchema), clientsController.updateClient);
router.get(
  "/:clientId/activity",
  validate(listActivitySchema, "query"),
  clientsController.listClientActivity,
);

// Hiding a client from the whole team is an owner/admin decision.
router.post("/:clientId/archive", requireRole("owner", "admin"), clientsController.archiveClient);
router.post("/:clientId/restore", requireRole("owner", "admin"), clientsController.restoreClient);

router.use("/:clientId/contacts", contactsRoutes);

export default router;
