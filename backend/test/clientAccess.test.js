import { describe, expect, it } from "vitest";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const makeClient = async (owner, workspaceId) => {
  const res = await owner.agent
    .post(`${base(workspaceId)}/clients`)
    .send({ companyName: "Acme Co" });

  return res.body.client.id;
};

const grant = (agent, workspaceId, clientId, userId) => {
  return agent.post(`${base(workspaceId)}/clients/${clientId}/access`).send({ userId });
};

describe("client portal access", () => {
  it("lets an owner give a client user access and lists them", async () => {
    const { owner, workspaceId } = await createWorkspace("Access Studio");
    const clientId = await makeClient(owner, workspaceId);
    const person = await addMemberTo(workspaceId, "client");
    const personId = person.res.body.user.id;

    const res = await grant(owner.agent, workspaceId, clientId, personId);

    expect(res.status).toBe(201);
    expect(res.body.person.userId).toBe(personId);

    const list = await owner.agent.get(`${base(workspaceId)}/clients/${clientId}/access`);

    expect(list.status).toBe(200);
    expect(list.body.people).toHaveLength(1);
    expect(list.body.people[0].userId).toBe(personId);
  });

  it("lets an admin give access too", async () => {
    const { owner, workspaceId } = await createWorkspace("Admin Access");
    const clientId = await makeClient(owner, workspaceId);
    const admin = await addMemberTo(workspaceId, "admin");
    const person = await addMemberTo(workspaceId, "client");

    const res = await grant(admin.agent, workspaceId, clientId, person.res.body.user.id);

    expect(res.status).toBe(201);
  });

  it("refuses members and clients on every route", async () => {
    const { owner, workspaceId } = await createWorkspace("Role Access");
    const clientId = await makeClient(owner, workspaceId);
    const person = await addMemberTo(workspaceId, "client");
    const personId = person.res.body.user.id;
    const member = await addMemberTo(workspaceId, "member");

    for (const who of [member, person]) {
      const url = `${base(workspaceId)}/clients/${clientId}/access`;

      expect((await who.agent.get(url)).status).toBe(403);
      expect((await grant(who.agent, workspaceId, clientId, personId)).status).toBe(403);
      expect((await who.agent.delete(`${url}/${personId}`)).status).toBe(403);
    }
  });

  it("hides the workspace from outsiders", async () => {
    const { owner, workspaceId } = await createWorkspace("Inside");
    const clientId = await makeClient(owner, workspaceId);
    const other = await createWorkspace("Outside");

    const res = await other.owner.agent.get(`${base(workspaceId)}/clients/${clientId}/access`);

    expect(res.status).toBe(404);
  });

  it("only accepts client-role members", async () => {
    const { owner, workspaceId } = await createWorkspace("Wrong Role");
    const clientId = await makeClient(owner, workspaceId);
    const member = await addMemberTo(workspaceId, "member");

    const res = await grant(owner.agent, workspaceId, clientId, member.res.body.user.id);

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.userId).toBeTruthy();
  });

  it("refuses a suspended client user", async () => {
    const { owner, workspaceId } = await createWorkspace("Suspended");
    const clientId = await makeClient(owner, workspaceId);
    const person = await addMemberTo(workspaceId, "client", "suspended");

    const res = await grant(owner.agent, workspaceId, clientId, person.res.body.user.id);

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.userId).toBeTruthy();
  });

  it("refuses a client user from another workspace", async () => {
    const { owner, workspaceId } = await createWorkspace("Mine");
    const clientId = await makeClient(owner, workspaceId);
    const other = await createWorkspace("Theirs");
    const stranger = await addMemberTo(other.workspaceId, "client");

    const res = await grant(owner.agent, workspaceId, clientId, stranger.res.body.user.id);

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.userId).toBeTruthy();
  });

  it("refuses giving the same access twice", async () => {
    const { owner, workspaceId } = await createWorkspace("Twice");
    const clientId = await makeClient(owner, workspaceId);
    const person = await addMemberTo(workspaceId, "client");
    const personId = person.res.body.user.id;

    await grant(owner.agent, workspaceId, clientId, personId);
    const again = await grant(owner.agent, workspaceId, clientId, personId);

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ACCESS_EXISTS");
  });

  it("returns 404 for a client that isn't in this workspace", async () => {
    const { owner, workspaceId } = await createWorkspace("No Client");
    const person = await addMemberTo(workspaceId, "client");
    const missing = "00000000-0000-4000-8000-000000000000";

    const res = await grant(owner.agent, workspaceId, missing, person.res.body.user.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CLIENT_NOT_FOUND");
  });

  it("revokes access, and a second revoke is a 404", async () => {
    const { owner, workspaceId } = await createWorkspace("Revoke");
    const clientId = await makeClient(owner, workspaceId);
    const person = await addMemberTo(workspaceId, "client");
    const personId = person.res.body.user.id;
    const url = `${base(workspaceId)}/clients/${clientId}/access`;

    await grant(owner.agent, workspaceId, clientId, personId);

    const first = await owner.agent.delete(`${url}/${personId}`);
    const second = await owner.agent.delete(`${url}/${personId}`);
    const list = await owner.agent.get(url);

    expect(first.status).toBe(204);
    expect(second.status).toBe(404);
    expect(second.body.error.code).toBe("ACCESS_NOT_FOUND");
    expect(list.body.people).toHaveLength(0);
  });

  it("lists client users who can still be given access", async () => {
    const { owner, workspaceId } = await createWorkspace("Candidates");
    const clientId = await makeClient(owner, workspaceId);
    const given = await addMemberTo(workspaceId, "client");
    const waiting = await addMemberTo(workspaceId, "client");

    await addMemberTo(workspaceId, "member");
    await grant(owner.agent, workspaceId, clientId, given.res.body.user.id);

    const url = `${base(workspaceId)}/clients/${clientId}/access/candidates`;
    const res = await owner.agent.get(url);

    expect(res.status).toBe(200);
    expect(res.body.people).toHaveLength(1);
    expect(res.body.people[0].userId).toBe(waiting.res.body.user.id);
  });
});
