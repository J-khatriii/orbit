import { db } from "../db/knex.js";
import * as membershipsRepository from "../repositories/memberships.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";

// Which roles each role may manage, and also hand out.
const MANAGEABLE_ROLES = {
  owner: ["admin", "member", "client"],
  admin: ["member", "client"],
};

const forbidden = (message) => {
  return new AppError(403, "FORBIDDEN", message);
};

// Finds the person being changed and checks the actor is allowed to touch them.
const loadManageableMember = async ({ workspaceId, actor, userId }) => {
  const target = isUuid(userId)
    ? await membershipsRepository.findForUser(db, { workspaceId, userId })
    : undefined;

  // Same answer for "not here" and "in another workspace", so nothing leaks.
  if (!target) {
    throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
  }
  if (userId === actor.id) {
    throw forbidden("You can't change your own access");
  }
  if (target.role === "owner") {
    throw forbidden("The owner's access can't be changed");
  }
  if (!(MANAGEABLE_ROLES[actor.role] ?? []).includes(target.role)) {
    throw forbidden("You don't have permission to manage this person");
  }

  return target;
};

export const changeMemberRole = async ({ workspaceId, actor, userId, role }) => {
  await loadManageableMember({ workspaceId, actor, userId });

  if (!MANAGEABLE_ROLES[actor.role].includes(role)) {
    throw forbidden("You can't give someone that role");
  }

  const row = await membershipsRepository.setRole(db, { workspaceId, userId, role });

  return { userId: row.user_id, role: row.role };
};

export const removeMember = async ({ workspaceId, actor, userId }) => {
  await loadManageableMember({ workspaceId, actor, userId });
  await membershipsRepository.deleteForUser(db, { workspaceId, userId });
};
