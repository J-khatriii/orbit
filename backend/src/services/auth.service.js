import { db } from "../db/knex.js";
import { hashPassword } from "../lib/password.js";
import { AppError } from "../utils/AppError.js";
import * as usersRepository from "../repositories/users.repository.js";
import * as workspacesRepository from "../repositories/workspaces.repository.js";
import * as membershipsRepository from "../repositories/memberships.repository.js";
import { generateUniqueSlug } from "./workspace.service.js";
import { toUser, toWorkspace } from "./serializers.js";

export const signup = async ({ name, email, password, workspaceName }) => {
  // Hash before opening the transaction: it is slow on purpose, and we want the
  // transaction to stay short
  const passwordHash = await hashPassword(password);

  try {
    return await db.transaction(async (trx) => {
      const user = await usersRepository.create(trx, { email, name, passwordHash });
      const slug = await generateUniqueSlug(trx, workspaceName);
      const workspace = await workspacesRepository.create(trx, {
        name: workspaceName,
        slug,
        ownerId: user.id,
      });
      const membership = await membershipsRepository.create(trx, {
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
      });

      return {
        user: toUser(user),
        workspace: toWorkspace(workspace, membership.role),
      };
    });
  } catch (err) {
    // 23505 = Postgres unique_violation. Knex names these constraints
    // "<table>_<column>_unique", so we match on the column name
    if (err.code === "23505" && err.constraint?.includes("email")) {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    if (err.code === "23505" && err.constraint?.includes("slug")) {
      throw new AppError(409, "SLUG_TAKEN", "That workspace address was just taken, please retry");
    }
    throw err;
  }
};
