import { randomBytes } from "node:crypto";
import { AppError } from "../utils/AppError.js";
import { slugify } from "../utils/slugify.js";
import * as workspacesRepository from "../repositories/workspaces.repository.js";

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
