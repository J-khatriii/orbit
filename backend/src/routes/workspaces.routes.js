import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { workspaceContext } from "../middleware/workspaceContext.js";
import { createInvitationSchema } from "../schemas/invitations.schemas.js";
import { updateWorkspaceSchema } from "../schemas/workspaces.schemas.js";
import * as invitationsController from "../controllers/invitations.controller.js";
import * as workspacesController from "../controllers/workspaces.controller.js";
import { changeMemberRoleSchema } from "../schemas/members.schemas.js";
import * as membersController from "../controllers/members.controller.js";

const router = Router();

router.use(requireAuth);

// Any member, including clients, can see the workspace they belong to.
router.get("/:workspaceId", workspaceContext, workspacesController.getWorkspace);

// Only owners and admins can change settings.
router.patch(
  "/:workspaceId",
  workspaceContext,
  requireRole("owner", "admin"),
  validate(updateWorkspaceSchema),
  workspacesController.updateWorkspace,
);

// The team list is internal: clients can't see it.
router.get(
  "/:workspaceId/members",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  workspacesController.listMembers,
);

// Invitations: owners and admins only. The service adds one more rule:
// admins can't invite other admins.
router.post(
  "/:workspaceId/invitations",
  workspaceContext,
  requireRole("owner", "admin"),
  validate(createInvitationSchema),
  invitationsController.createInvitation,
);

router.get(
  "/:workspaceId/invitations",
  workspaceContext,
  requireRole("owner", "admin"),
  invitationsController.listInvitations,
);

router.delete(
  "/:workspaceId/invitations/:invitationId",
  workspaceContext,
  requireRole("owner", "admin"),
  invitationsController.revokeInvitation,
);

// Changing or removing people: owners and admins only. The service adds the finer rules
// (admins can only manage team members and clients, the owner is untouchable).
router.patch(
  "/:workspaceId/members/:userId",
  workspaceContext,
  requireRole("owner", "admin"),
  validate(changeMemberRoleSchema),
  membersController.changeMemberRole,
);

router.delete(
  "/:workspaceId/members/:userId",
  workspaceContext,
  requireRole("owner", "admin"),
  membersController.removeMember,
);

export default router;
