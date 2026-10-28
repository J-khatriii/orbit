import { randomBytes } from "node:crypto";
import { db } from "../db/knex.js";
import { AppError } from "../utils/AppError.js";
import { slugify } from "../utils/slugify.js";
import * as membershipsRepository from "../repositories/memberships.repository.js";
import * as workspacesRepository from "../repositories/workspaces.repository.js";
import { toMember, toWorkspace } from "./serializers.js";

const randomSuffix = () => {
  return randomBytes(3).toString("hex");
};

export const generateUniqueSlug = async (executor, name) => {
  const base = slugify(name);
  let candidate = base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!(await workspacesRepository.slugExists(executor, candidate))) {
      return candidate;
    }
    candidate = `${base}-${randomSuffix()}`;
  }

  throw new AppError(500, "SLUG_GENERATION_FAILED", "Could not create a workspace address");
};

const COLUMN_NAMES = {
  name: "name",
  brandColor: "brand_color",
  defaultCurrency: "default_currency",
  timezone: "timezone",
};

export const updateWorkspace = async (workspaceId, changes, role) => {
  const columns = {};

  for (const [key, value] of Object.entries(changes)) {
    columns[COLUMN_NAMES[key]] = value;
  }

  const row = await workspacesRepository.update(db, workspaceId, columns);

  return toWorkspace(row, role);
};

export const listMembers = async (workspaceId) => {
  const rows = await membershipsRepository.listForWorkspace(db, workspaceId);

  return rows.map((row) => {
    return toMember(row);
  });
};
