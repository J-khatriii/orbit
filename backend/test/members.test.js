import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WORKSPACES = "/api/v1/workspaces";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const idOf = (user) => {
  return user.res.body.user.id;
};

const memberUrl = (workspaceId, userId) => {
  return `${WORKSPACES}/${workspaceId}/members/${userId}`;
};

describe("changing a member's role", () => {
  it("lets the owner promote a member, and the new powers apply immediately", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const member = await addMemberTo(workspaceId, "member");
    const settings = `${WORKSPACES}/${workspaceId}`;

    expect((await member.agent.patch(settings).send({ name: "Nope" })).status).toBe(403);

    const res = await owner.agent
      .patch(memberUrl(workspaceId, idOf(member)))
      .send({ role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body.member).toEqual({ userId: idOf(member), role: "admin" });
    expect((await member.agent.patch(settings).send({ name: "Now allowed" })).status).toBe(200);
  });

  it("lets the owner demote an admin, who then loses access to the team list", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const admin = await addMemberTo(workspaceId, "admin");
    const list = `${WORKSPACES}/${workspaceId}/members`;

    expect((await admin.agent.get(list)).status).toBe(200);

    const res = await owner.agent
      .patch(memberUrl(workspaceId, idOf(admin)))
      .send({ role: "client" });

    expect(res.status).toBe(200);
    expect((await admin.agent.get(list)).status).toBe(403);
  });

  it("lets an admin change a team member to a client", async () => {
    const { workspaceId } = await createWorkspace();
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");
    const res = await admin.agent
      .patch(memberUrl(workspaceId, idOf(member)))
      .send({ role: "client" });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe("client");
  });

  it("stops an admin from creating another admin", async () => {
    const { workspaceId } = await createWorkspace();
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");
    const res = await admin.agent
      .patch(memberUrl(workspaceId, idOf(member)))
      .send({ role: "admin" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("stops an admin from changing another admin", async () => {
    const { workspaceId } = await createWorkspace();
    const admin = await addMemberTo(workspaceId, "admin");
    const other = await addMemberTo(workspaceId, "admin");
    const res = await admin.agent
      .patch(memberUrl(workspaceId, idOf(other)))
      .send({ role: "member" });

    expect(res.status).toBe(403);
  });

  for (const role of ["member", "client"]) {
    it(`stops a ${role} from changing anyone's role`, async () => {
      const { workspaceId } = await createWorkspace();
      const actor = await addMemberTo(workspaceId, role);
      const other = await addMemberTo(workspaceId, "member");
      const res = await actor.agent
        .patch(memberUrl(workspaceId, idOf(other)))
        .send({ role: "client" });

      expect(res.status).toBe(403);
    });
  }

  it("never lets the owner's role change, even by themselves", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const admin = await addMemberTo(workspaceId, "admin");
    const byAdmin = await admin.agent
      .patch(memberUrl(workspaceId, idOf(owner)))
      .send({ role: "member" });
    const bySelf = await owner.agent
      .patch(memberUrl(workspaceId, idOf(owner)))
      .send({ role: "member" });

    expect(byAdmin.status).toBe(403);
    expect(bySelf.status).toBe(403);
  });

  it("refuses to hand out the owner role", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const member = await addMemberTo(workspaceId, "member");
    const res = await owner.agent
      .patch(memberUrl(workspaceId, idOf(member)))
      .send({ role: "owner" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("answers 404 for unknown people, people in other workspaces, and bad ids", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const elsewhere = await createWorkspace("Elsewhere");
    const stranger = elsewhere.owner;
    const body = { role: "member" };

    const unknown = await owner.agent.patch(memberUrl(workspaceId, MISSING_ID)).send(body);
    const outsider = await owner.agent.patch(memberUrl(workspaceId, idOf(stranger))).send(body);
    const malformed = await owner.agent.patch(memberUrl(workspaceId, "not-a-uuid")).send(body);

    expect(unknown.status).toBe(404);
    expect(outsider.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(unknown.body.error.code).toBe("MEMBER_NOT_FOUND");
  });
});

describe("removing a member", () => {
  it("lets the owner remove someone, and they lose access straight away", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const member = await addMemberTo(workspaceId, "member");

    expect((await member.agent.get(`${WORKSPACES}/${workspaceId}`)).status).toBe(200);

    const res = await owner.agent.delete(memberUrl(workspaceId, idOf(member)));

    expect(res.status).toBe(204);
    expect((await member.agent.get(`${WORKSPACES}/${workspaceId}`)).status).toBe(404);

    const row = await db("memberships")
      .where({ workspace_id: workspaceId, user_id: idOf(member) })
      .first();

    expect(row).toBeUndefined();
  });

  it("lets an admin remove team members and clients", async () => {
    const { workspaceId } = await createWorkspace();
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");
    const client = await addMemberTo(workspaceId, "client");

    expect((await admin.agent.delete(memberUrl(workspaceId, idOf(member)))).status).toBe(204);
    expect((await admin.agent.delete(memberUrl(workspaceId, idOf(client)))).status).toBe(204);
  });

  it("stops an admin from removing an admin or the owner", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const admin = await addMemberTo(workspaceId, "admin");
    const other = await addMemberTo(workspaceId, "admin");

    expect((await admin.agent.delete(memberUrl(workspaceId, idOf(other)))).status).toBe(403);
    expect((await admin.agent.delete(memberUrl(workspaceId, idOf(owner)))).status).toBe(403);
  });

  for (const role of ["member", "client"]) {
    it(`stops a ${role} from removing anyone`, async () => {
      const { workspaceId } = await createWorkspace();
      const actor = await addMemberTo(workspaceId, role);
      const other = await addMemberTo(workspaceId, "member");
      const res = await actor.agent.delete(memberUrl(workspaceId, idOf(other)));

      expect(res.status).toBe(403);
    });
  }

  it("stops the owner from removing themselves", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const res = await owner.agent.delete(memberUrl(workspaceId, idOf(owner)));

    expect(res.status).toBe(403);
  });

  it("can't remove someone through a workspace they don't belong to", async () => {
    const mine = await createWorkspace("Mine");
    const theirs = await createWorkspace("Theirs");
    const res = await mine.owner.agent.delete(memberUrl(mine.workspaceId, idOf(theirs.owner)));

    expect(res.status).toBe(404);

    const check = await theirs.owner.agent.get(`${WORKSPACES}/${theirs.workspaceId}`);

    expect(check.status).toBe(200);
  });
});
