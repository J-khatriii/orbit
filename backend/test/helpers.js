import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/db/knex.js";
import { sendEmail } from "../src/lib/mailer.js";

export const PASSWORD = "correct-horse-battery";

let counter = 0;

// A plain client with no cookies.
export const api = () => {
  return request(app);
};

// A client that remembers cookies between calls, like a browser.
export const newAgent = () => {
  return request.agent(app);
};

// Creates a real account through the API. Returns the signed-in agent too.
export const signupAs = async ({
  name = "Test User",
  email,
  workspaceName = "Test Workspace",
} = {}) => {
  counter += 1;
  const agent = newAgent();
  const finalEmail = email ?? `user${counter}@example.com`;
  const res = await agent
    .post("/api/v1/auth/signup")
    .send({ name, email: finalEmail, password: PASSWORD, workspaceName });

  return { agent, res, email: finalEmail, password: PASSWORD };
};

// Finds the newest "sent" email whose subject contains the text, and returns its token.
export const tokenFromEmail = (subjectPart) => {
  const messages = sendEmail.mock.calls.map(([message]) => {
    return message;
  });
  const match = messages.findLast((message) => {
    return message.subject.includes(subjectPart);
  });

  return match?.text.match(/token=([\w-]+)/)?.[1];
};

// A new user who owns a brand new workspace.
export const createWorkspace = async (workspaceName = "Acme Studio") => {
  const owner = await signupAs({ workspaceName });

  return { owner, workspaceId: owner.res.body.workspaces[0].id };
};

// Puts an existing user into a workspace with a role. Invites don't exist yet (Step 2.6),
// so tests write the membership straight into the database.
export const grantRole = async (workspaceId, userId, role, status = "active") => {
  await db("memberships").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role,
    status,
  });
};

// A new signed-in user who is also a member of the given workspace.
export const addMemberTo = async (workspaceId, role, status = "active") => {
  const member = await signupAs();

  await grantRole(workspaceId, member.res.body.user.id, role, status);

  return member;
};
