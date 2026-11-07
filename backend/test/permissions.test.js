import { describe, expect, it } from "vitest";
import { addMemberTo, api, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

// A workspace with an owner, one client and one project.
const build = async () => {
  const { owner, workspaceId } = await createWorkspace();
  const base = `${WS}/${workspaceId}`;
  const client = await owner.agent
    .post(`${base}/clients`)
    .send({ companyName: "Northwind Studio" });
  const clientId = client.body.client.id;
  const project = await owner.agent
    .post(`${base}/projects`)
    .send({ clientId, name: "Website redesign" });

  return {
    owner,
    workspaceId,
    base,
    clientId,
    projectId: project.body.project.id,
    ownerId: owner.res.body.user.id,
  };
};

// Requests that only read. `ok` is the status a permitted person gets.
const readChecks = ({ base, clientId, projectId }) => {
  return [
    { label: "list clients", method: "get", path: `${base}/clients`, ok: 200 },
    { label: "client tags", method: "get", path: `${base}/clients/tags`, ok: 200 },
    { label: "get client", method: "get", path: `${base}/clients/${clientId}`, ok: 200 },
    {
      label: "client activity",
      method: "get",
      path: `${base}/clients/${clientId}/activity`,
      ok: 200,
    },
    {
      label: "list contacts",
      method: "get",
      path: `${base}/clients/${clientId}/contacts`,
      ok: 200,
    },
    { label: "list projects", method: "get", path: `${base}/projects`, ok: 200 },
    { label: "get project", method: "get", path: `${base}/projects/${projectId}`, ok: 200 },
    {
      label: "project activity",
      method: "get",
      path: `${base}/projects/${projectId}/activity`,
      ok: 200,
    },
    { label: "workspace activity", method: "get", path: `${base}/activity`, ok: 200 },
  ];
};

// Requests that change things, which a team member may do. `tag` keeps names unique,
// because two active clients can't share a name.
const writeChecks = ({ base, clientId, projectId }, tag) => {
  return [
    {
      label: "create client",
      method: "post",
      path: `${base}/clients`,
      body: { companyName: `Client ${tag}` },
      ok: 201,
    },
    {
      label: "edit client",
      method: "patch",
      path: `${base}/clients/${clientId}`,
      body: { notesInternal: `note ${tag}` },
      ok: 200,
    },
    {
      label: "add contact",
      method: "post",
      path: `${base}/clients/${clientId}/contacts`,
      body: { name: `Contact ${tag}` },
      ok: 201,
    },
    {
      label: "create project",
      method: "post",
      path: `${base}/projects`,
      body: { clientId, name: `Project ${tag}` },
      ok: 201,
    },
    {
      label: "edit project",
      method: "patch",
      path: `${base}/projects/${projectId}`,
      body: { description: `desc ${tag}` },
      ok: 200,
    },
  ];
};

// Requests that need the owner or an admin. Everyone else must be refused before
// anything is looked up, so the ids here only need to be well-formed.
const restrictedChecks = ({ base, clientId, projectId, ownerId }) => {
  return [
    { label: "archive client", method: "post", path: `${base}/clients/${clientId}/archive` },
    { label: "restore client", method: "post", path: `${base}/clients/${clientId}/restore` },
    { label: "archive project", method: "post", path: `${base}/projects/${projectId}/archive` },
    { label: "restore project", method: "post", path: `${base}/projects/${projectId}/restore` },
    {
      label: "delete contact",
      method: "delete",
      path: `${base}/clients/${clientId}/contacts/${MISSING_ID}`,
    },
    {
      label: "assign to project",
      method: "post",
      path: `${base}/projects/${projectId}/members`,
      body: { userId: ownerId },
    },
    {
      label: "unassign from project",
      method: "delete",
      path: `${base}/projects/${projectId}/members/${ownerId}`,
    },
  ];
};

const call = (who, check) => {
  const request = who[check.method](check.path);

  return check.body ? request.send(check.body) : request;
};

describe("people who work in the workspace", () => {
  for (const role of ["owner", "admin", "member"]) {
    it(`lets the ${role} read, create and edit clients, contacts and projects`, async () => {
      const ctx = await build();
      const who = role === "owner" ? ctx.owner : await addMemberTo(ctx.workspaceId, role);

      for (const check of [...readChecks(ctx), ...writeChecks(ctx, role)]) {
        const res = await call(who.agent, check);

        expect(res.status, `${role}: ${check.label}`).toBe(check.ok);
      }
    });
  }
});

describe("everyone else", () => {
  const everything = (ctx) => {
    return [...readChecks(ctx), ...writeChecks(ctx, "x"), ...restrictedChecks(ctx)];
  };

  it("keeps portal clients out of every internal endpoint (403)", async () => {
    const ctx = await build();
    const portalClient = await addMemberTo(ctx.workspaceId, "client");

    for (const check of everything(ctx)) {
      const res = await call(portalClient.agent, check);

      expect(res.status, `client role: ${check.label}`).toBe(403);
    }
  });

  it("treats a stranger like the workspace doesn't exist (404)", async () => {
    const ctx = await build();
    const stranger = await createWorkspace("Elsewhere");

    for (const check of everything(ctx)) {
      const res = await call(stranger.owner.agent, check);

      expect(res.status, `stranger: ${check.label}`).toBe(404);
    }
  });

  it("locks out a suspended member at once (404)", async () => {
    const ctx = await build();
    const suspended = await addMemberTo(ctx.workspaceId, "member", "suspended");

    for (const check of everything(ctx)) {
      const res = await call(suspended.agent, check);

      expect(res.status, `suspended: ${check.label}`).toBe(404);
    }
  });

  it("requires sign-in everywhere (401)", async () => {
    const ctx = await build();

    for (const check of everything(ctx)) {
      const res = await call(api(), check);

      expect(res.status, `signed out: ${check.label}`).toBe(401);
    }
  });
});

describe("owner-only and admin-only actions", () => {
  it("lets only owners and admins archive and restore", async () => {
    const ctx = await build();
    const member = await addMemberTo(ctx.workspaceId, "member");
    const admin = await addMemberTo(ctx.workspaceId, "admin");
    const targets = [
      `${ctx.base}/projects/${ctx.projectId}`,
      `${ctx.base}/clients/${ctx.clientId}`,
    ];

    for (const target of targets) {
      expect((await member.agent.post(`${target}/archive`)).status, `member: ${target}`).toBe(403);
      expect((await admin.agent.post(`${target}/archive`)).status, `admin archive`).toBe(200);
      expect((await member.agent.post(`${target}/restore`)).status, `member restore`).toBe(403);
      expect((await admin.agent.post(`${target}/restore`)).status, `admin restore`).toBe(200);
    }
  });
});

describe("one workspace never reaches into another", () => {
  it("answers 404 for another workspace's ids, even from a real member", async () => {
    const a = await build();
    const b = await createWorkspace("Elsewhere");
    const bBase = `${WS}/${b.workspaceId}`;
    const attempts = [
      { label: "get client", method: "get", path: `${bBase}/clients/${a.clientId}` },
      {
        label: "edit client",
        method: "patch",
        path: `${bBase}/clients/${a.clientId}`,
        body: { notesInternal: "hijack" },
      },
      { label: "client activity", method: "get", path: `${bBase}/clients/${a.clientId}/activity` },
      { label: "list contacts", method: "get", path: `${bBase}/clients/${a.clientId}/contacts` },
      {
        label: "add contact",
        method: "post",
        path: `${bBase}/clients/${a.clientId}/contacts`,
        body: { name: "Intruder" },
      },
      { label: "get project", method: "get", path: `${bBase}/projects/${a.projectId}` },
      {
        label: "edit project",
        method: "patch",
        path: `${bBase}/projects/${a.projectId}`,
        body: { description: "hijack" },
      },
      {
        label: "project activity",
        method: "get",
        path: `${bBase}/projects/${a.projectId}/activity`,
      },
      {
        label: "project for someone else's client",
        method: "post",
        path: `${bBase}/projects`,
        body: { clientId: a.clientId, name: "Sneaky" },
      },
    ];

    for (const attempt of attempts) {
      const res = await call(b.owner.agent, attempt);

      expect(res.status, attempt.label).toBe(404);
    }

    // And nothing in workspace A changed.
    const client = await a.owner.agent.get(`${a.base}/clients/${a.clientId}`);

    expect(client.body.client.notesInternal).toBeNull();
  });
});
