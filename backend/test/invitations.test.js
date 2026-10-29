import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { sendEmail } from "../src/lib/mailer.js";
import {
  addMemberTo,
  api,
  createWorkspace,
  newAgent,
  signupAs,
  tokenFromEmail,
} from "./helpers.js";

const WORKSPACES = "/api/v1/workspaces";
const INVITATIONS = "/api/v1/invitations";
const AUTH = "/api/v1/auth";

const invitationsUrl = (workspaceId) => {
  return `${WORKSPACES}/${workspaceId}/invitations`;
};

// Invites someone and returns the token from the "sent" email.
const inviteAndGetToken = async (owner, workspaceId, email, role = "member") => {
  const res = await owner.agent.post(invitationsUrl(workspaceId)).send({ email, role });

  expect(res.status).toBe(201);

  return tokenFromEmail("invited you");
};

const preview = async (token) => {
  return api().post(`${INVITATIONS}/preview`).send({ token });
};

describe("creating invitations", () => {
  it("lowercases the email, sends the invitation and lists it as pending", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const res = await owner.agent
      .post(invitationsUrl(workspaceId))
      .send({ email: "Sam@Example.com", role: "member" });

    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(true);
    expect(res.body.invitation).toMatchObject({ email: "sam@example.com", role: "member" });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "sam@example.com" }));
    expect(tokenFromEmail("invited you")).toBeTruthy();

    const list = await owner.agent.get(invitationsUrl(workspaceId));

    expect(list.status).toBe(200);
    expect(list.body.invitations).toHaveLength(1);
  });

  // Who may invite whom. Nobody can ever be invited as owner, and admins can't make admins.
  const INVITE_RULES = [
    { inviter: "owner", invitee: "admin", status: 201 },
    { inviter: "owner", invitee: "member", status: 201 },
    { inviter: "owner", invitee: "client", status: 201 },
    { inviter: "owner", invitee: "owner", status: 400 },
    { inviter: "admin", invitee: "admin", status: 403 },
    { inviter: "admin", invitee: "member", status: 201 },
    { inviter: "admin", invitee: "client", status: 201 },
    { inviter: "member", invitee: "member", status: 403 },
    { inviter: "client", invitee: "member", status: 403 },
  ];

  for (const rule of INVITE_RULES) {
    it(`${rule.inviter} inviting a ${rule.invitee} gets ${rule.status}`, async () => {
      const { owner, workspaceId } = await createWorkspace();
      const user = rule.inviter === "owner" ? owner : await addMemberTo(workspaceId, rule.inviter);
      const res = await user.agent
        .post(invitationsUrl(workspaceId))
        .send({ email: "invitee@example.com", role: rule.invitee });

      expect(res.status).toBe(rule.status);
    });
  }

  it("refuses to invite someone who is already a member", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const member = await addMemberTo(workspaceId, "member");
    const res = await owner.agent
      .post(invitationsUrl(workspaceId))
      .send({ email: member.email, role: "client" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_MEMBER");
  });

  it("replaces the old link when the same email is invited again", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const first = await inviteAndGetToken(owner, workspaceId, "sam@example.com", "member");
    const second = await inviteAndGetToken(owner, workspaceId, "sam@example.com", "client");

    expect(second).not.toBe(first);
    expect((await preview(first)).status).toBe(400);

    const ok = await preview(second);

    expect(ok.status).toBe(200);
    expect(ok.body.invitation.role).toBe("client");

    const list = await owner.agent.get(invitationsUrl(workspaceId));

    expect(list.body.invitations).toHaveLength(1);
  });

  it("kills the link when an invitation is revoked", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, "sam@example.com");
    const list = await owner.agent.get(invitationsUrl(workspaceId));
    const id = list.body.invitations[0].id;

    expect((await owner.agent.delete(`${invitationsUrl(workspaceId)}/${id}`)).status).toBe(204);
    expect((await preview(token)).status).toBe(400);
    expect((await owner.agent.delete(`${invitationsUrl(workspaceId)}/${id}`)).status).toBe(404);
  });

  it("never lets one workspace revoke another workspace's invitation", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await createWorkspace("Beta");

    await inviteAndGetToken(alpha.owner, alpha.workspaceId, "sam@example.com");

    const list = await alpha.owner.agent.get(invitationsUrl(alpha.workspaceId));
    const id = list.body.invitations[0].id;

    // Through Beta's own URL, and through Alpha's URL.
    const viaOwn = await beta.owner.agent.delete(`${invitationsUrl(beta.workspaceId)}/${id}`);
    const viaTheirs = await beta.owner.agent.delete(`${invitationsUrl(alpha.workspaceId)}/${id}`);

    expect(viaOwn.status).toBe(404);
    expect(viaTheirs.status).toBe(404);

    const still = await alpha.owner.agent.get(invitationsUrl(alpha.workspaceId));

    expect(still.body.invitations).toHaveLength(1);
  });

  it("hides the invitation list from members", async () => {
    const { workspaceId } = await createWorkspace();
    const member = await addMemberTo(workspaceId, "member");
    const res = await member.agent.get(invitationsUrl(workspaceId));

    expect(res.status).toBe(403);
  });
});

describe("accepting invitations", () => {
  it("shows the invitation details to someone with the link", async () => {
    const { owner, workspaceId } = await createWorkspace("Acme Studio");
    const token = await inviteAndGetToken(owner, workspaceId, "new@example.com", "client");
    const res = await preview(token);

    expect(res.status).toBe(200);
    expect(res.body.invitation).toEqual({
      workspaceName: "Acme Studio",
      email: "new@example.com",
      role: "client",
      invitedByName: "Test User",
      accountExists: false,
    });
  });

  it("tells the page when the invited email already has an account", async () => {
    const existing = await signupAs();
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, existing.email);
    const res = await preview(token);

    expect(res.body.invitation.accountExists).toBe(true);
  });

  it("lets a new person create an account and join, without using up the link on mistakes", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, "newbie@example.com");
    const newcomer = newAgent();

    const missing = await newcomer.post(`${INVITATIONS}/accept`).send({ token });

    expect(missing.status).toBe(400);
    expect(missing.body.error.details.fields).toHaveProperty("name");
    expect(missing.body.error.details.fields).toHaveProperty("password");
    // The failed attempt rolled back, so the link still works.
    expect((await preview(token)).status).toBe(200);

    const res = await newcomer
      .post(`${INVITATIONS}/accept`)
      .send({ token, name: "Nia Newbie", password: "newbie-password-123" });

    expect(res.status).toBe(200);
    expect(res.body.workspaceId).toBe(workspaceId);
    expect(res.body.workspaces).toHaveLength(1);
    expect(res.body.workspaces[0]).toMatchObject({ id: workspaceId, role: "member" });
    expect(res.headers["set-cookie"][0]).toMatch(/orbit_session=/);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    const me = await newcomer.get(`${AUTH}/me`);

    expect(me.body.user).toMatchObject({
      email: "newbie@example.com",
      name: "Nia Newbie",
      emailVerified: true,
    });

    const members = await owner.agent.get(`${WORKSPACES}/${workspaceId}/members`);

    expect(members.body.members).toHaveLength(2);
  });

  it("works only once", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, "newbie@example.com");
    const body = { token, name: "Nia Newbie", password: "newbie-password-123" };

    expect((await newAgent().post(`${INVITATIONS}/accept`).send(body)).status).toBe(200);

    const again = await api().post(`${INVITATIONS}/accept`).send(body);

    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe("INVALID_TOKEN");
  });

  it("asks an existing user to sign in instead of creating a second account", async () => {
    const existing = await signupAs();
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, existing.email);
    const res = await api()
      .post(`${INVITATIONS}/accept`)
      .send({ token, name: "Someone", password: "some-long-password" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ACCOUNT_EXISTS");
    expect((await preview(token)).status).toBe(200);
  });

  it("refuses the wrong signed-in person, then lets the right one join as a client", async () => {
    const invitee = await signupAs();
    const stranger = await signupAs();
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, invitee.email, "client");

    const wrong = await stranger.agent.post(`${INVITATIONS}/accept`).send({ token });

    expect(wrong.status).toBe(403);
    expect(wrong.body.error.code).toBe("EMAIL_MISMATCH");

    const right = await invitee.agent.post(`${INVITATIONS}/accept`).send({ token });

    expect(right.status).toBe(200);
    // Their own workspace from signup, plus the one they just joined.
    expect(right.body.workspaces).toHaveLength(2);

    const workspace = await invitee.agent.get(`${WORKSPACES}/${workspaceId}`);
    const members = await invitee.agent.get(`${WORKSPACES}/${workspaceId}/members`);

    expect(workspace.body.workspace.role).toBe("client");
    expect(members.status).toBe(403);
  });

  it("refuses an expired invitation", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, "late@example.com");

    await db("invitations").update({ expires_at: new Date(Date.now() - 1000) });

    expect((await preview(token)).status).toBe(400);

    const res = await api()
      .post(`${INVITATIONS}/accept`)
      .send({ token, name: "Late Person", password: "late-password-123" });

    expect(res.status).toBe(400);

    const list = await owner.agent.get(invitationsUrl(workspaceId));

    expect(list.body.invitations).toHaveLength(0);
  });

  it("gives a client who joins through a link no workspace of their own and no team list", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const token = await inviteAndGetToken(owner, workspaceId, "client@example.com", "client");
    const client = newAgent();
    const res = await client
      .post(`${INVITATIONS}/accept`)
      .send({ token, name: "Cleo Client", password: "client-password-123" });

    expect(res.status).toBe(200);
    expect(res.body.workspaces).toHaveLength(1);
    expect(res.body.workspaces[0].role).toBe("client");
    expect((await client.get(`${WORKSPACES}/${workspaceId}`)).status).toBe(200);
    expect((await client.get(`${WORKSPACES}/${workspaceId}/members`)).status).toBe(403);
  });
});
