import { afterAll, beforeEach, vi } from "vitest";
import { db } from "../src/db/knex.js";

// Tests never send real email. Each call is recorded so tests can read the links.
vi.mock("../src/lib/mailer.js", () => {
  return { sendEmail: vi.fn().mockResolvedValue({ messageId: "test-message" }) };
});

// Every test starts from an empty database
beforeEach(async () => {
  await db.raw(
    "TRUNCATE TABLE auth_tokens, sessions, memberships, workspaces, users RESTART IDENTITY CASCADE",
  );
  vi.clearAllMocks();
});

afterAll(async () => {
  await db.destroy();
});
