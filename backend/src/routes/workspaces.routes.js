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
import clientsRoutes from "./clients.routes.js";
import { listActivitySchema } from "../schemas/activity.schemas.js";
import * as activityController from "../controllers/activity.controller.js";
import projectsRoutes from "./projects.routes.js";
import { listMyTasksSchema } from "../schemas/tasks.schemas.js";
import * as tasksController from "../controllers/tasks.controller.js";
import templatesRoutes from "./templates.routes.js";
import clientAccessRoutes from "./clientAccess.routes.js";
import messagesRoutes from "./messages.routes.js";

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

// Who can open a client's portal: owners and admins only. Mounted before the clients
// router so this stricter rule applies to these paths.
router.use(
  "/:workspaceId/clients/:clientId/access",
  workspaceContext,
  requireRole("owner", "admin"),
  clientAccessRoutes,
);

// A client's conversation. Team only: clients (the role) use the portal instead.
router.use(
  "/:workspaceId/clients/:clientId/messages",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  messagesRoutes,
);

// The client list is internal: clients (the role) never see it.
router.use(
  "/:workspaceId/clients",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  clientsRoutes,
);

// The workspace-wide history. Internal, like the client list.
router.get(
  "/:workspaceId/activity",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  validate(listActivitySchema, "query"),
  activityController.listWorkspaceActivity,
);

// Everything assigned to me, across projects. Internal, like the other lists.
router.get(
  "/:workspaceId/my-tasks",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  validate(listMyTasksSchema, "query"),
  tasksController.listMyTasks,
);

// Projects are internal, like clients.
router.use(
  "/:workspaceId/projects",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  projectsRoutes,
);

// Starter task lists. Internal, like projects.
router.use(
  "/:workspaceId/templates",
  workspaceContext,
  requireRole("owner", "admin", "member"),
  templatesRoutes,
);

export default router;
