import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, api, createWorkspace, grantRole, signupAs } from "./helpers.js";

const WORKSPACES = "/api/v1/workspaces";
const ROLES = ["owner", "admin", "member", "client"];
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

describe("workspace access", () => {
  it("treats an outsider exactly like a missing workspace", async () => {
    const { workspaceId } = await createWorkspace();
    const outsider = await signupAs();
    const real = await outsider.agent.get(`${WORKSPACES}/${workspaceId}`);
    const missing = await outsider.agent.get(`${WORKSPACES}/${MISSING_ID}`);

    expect(real.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(real.body).toEqual(missing.body);
  });

  it("locks out a suspended member immediately, even with a valid session", async () => {
    const { workspaceId } = await createWorkspace();
    const member = await addMemberTo(workspaceId, "member");
    const url = `${WORKSPACES}/${workspaceId}`;

    expect((await member.agent.get(url)).status).toBe(200);

    await db("memberships")
      .where({ workspace_id: workspaceId, user_id: member.res.body.user.id })
      .update({ status: "suspended" });

    expect((await member.agent.get(url)).status).toBe(404);
  });

  it("requires sign-in", async () => {
    const { workspaceId } = await createWorkspace();
    const res = await api().get(`${WORKSPACES}/${workspaceId}`);

    expect(res.status).toBe(401);
  });

  it("rejects a malformed workspace id without a server error", async () => {
    const { owner } = await createWorkspace();
    const res = await owner.agent.get(`${WORKSPACES}/not-a-uuid`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("WORKSPACE_NOT_FOUND");
  });
});

// Each rule says which roles may do an action. Every role is tried against every rule.
const RULES = [
  {
    action: "view the workspace",
    method: "get",
    path: "",
    allowed: ["owner", "admin", "member", "client"],
  },
  {
    action: "change settings",
    method: "patch",
    path: "",
    body: { name: "Renamed Studio" },
    allowed: ["owner", "admin"],
  },
  {
    action: "list members",
    method: "get",
    path: "/members",
    allowed: ["owner", "admin", "member"],
  },
];

describe("who can do what", () => {
  for (const rule of RULES) {
    for (const role of ROLES) {
      const allowed = rule.allowed.includes(role);

      it(`${role} ${allowed ? "can" : "cannot"} ${rule.action}`, async () => {
        const { owner, workspaceId } = await createWorkspace();
        const user = role === "owner" ? owner : await addMemberTo(workspaceId, role);
        const call = user.agent[rule.method](`${WORKSPACES}/${workspaceId}${rule.path}`);
        const res = rule.body ? await call.send(rule.body) : await call;

        expect(res.status).toBe(allowed ? 200 : 403);
        expect(res.body.error?.code).toBe(allowed ? undefined : "FORBIDDEN");
      });
    }
  }
});

describe("tenant isolation", () => {
  it("keeps two workspaces completely apart", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await createWorkspace("Beta");
    const betaUrl = `${WORKSPACES}/${beta.workspaceId}`;

    expect((await alpha.owner.agent.get(betaUrl)).status).toBe(404);
    expect((await alpha.owner.agent.patch(betaUrl).send({ name: "Taken Over" })).status).toBe(404);
    expect((await alpha.owner.agent.get(`${betaUrl}/members`)).status).toBe(404);

    const check = await beta.owner.agent.get(betaUrl);

    expect(check.body.workspace.name).toBe("Beta");
  });

  it("gives one person a separate role in each workspace", async () => {
    const one = await createWorkspace("One");
    const two = await createWorkspace("Two");
    const person = await signupAs();
    const personId = person.res.body.user.id;

    await grantRole(one.workspaceId, personId, "admin");
    await grantRole(two.workspaceId, personId, "member");

    const change = { name: "Renamed" };
    const inOne = await person.agent.patch(`${WORKSPACES}/${one.workspaceId}`).send(change);
    const inTwo = await person.agent.patch(`${WORKSPACES}/${two.workspaceId}`).send(change);
    const me = await person.agent.get("/api/v1/auth/me");

    expect(inOne.status).toBe(200);
    expect(inTwo.status).toBe(403);
    // Their own workspace from signup, plus the two they were added to.
    expect(me.body.workspaces).toHaveLength(3);
  });
});

describe("workspace settings", () => {
  it("cleans up the values it saves and leaves the address alone", async () => {
    const { owner, workspaceId } = await createWorkspace("Acme Studio");
    const res = await owner.agent.patch(`${WORKSPACES}/${workspaceId}`).send({
      name: "  New Name  ",
      brandColor: "#ABCDEF",
      defaultCurrency: "gbp",
      timezone: "Asia/Kolkata",
    });

    expect(res.status).toBe(200);
    expect(res.body.workspace).toMatchObject({
      name: "New Name",
      slug: "acme-studio",
      brandColor: "#abcdef",
      defaultCurrency: "GBP",
      timezone: "Asia/Kolkata",
    });
  });

  it("rejects fields it doesn't own", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = `${WORKSPACES}/${workspaceId}`;
    const slug = await owner.agent.patch(url).send({ slug: "hijacked" });
    const ownerId = await owner.agent.patch(url).send({ ownerId: MISSING_ID });

    expect(slug.status).toBe(400);
    expect(ownerId.status).toBe(400);
  });

  it("rejects an empty change and invalid values", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = `${WORKSPACES}/${workspaceId}`;

    expect((await owner.agent.patch(url).send({})).status).toBe(400);
    expect((await owner.agent.patch(url).send({ timezone: "Mars/Base" })).status).toBe(400);
    expect((await owner.agent.patch(url).send({ brandColor: "blue" })).status).toBe(400);
  });
});

describe("members list", () => {
  it("lists everyone with their role and never exposes password data", async () => {
    const { owner, workspaceId } = await createWorkspace();

    await addMemberTo(workspaceId, "admin");
    await addMemberTo(workspaceId, "client");

    const res = await owner.agent.get(`${WORKSPACES}/${workspaceId}/members`);
    const roles = res.body.members
      .map((member) => {
        return member.role;
      })
      .sort();

    expect(res.status).toBe(200);
    expect(roles).toEqual(["admin", "client", "owner"]);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });
});
