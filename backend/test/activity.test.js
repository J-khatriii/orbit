import { describe, expect, it } from "vitest";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WORKSPACES = "/api/v1/workspaces";

const clientsUrl = (workspaceId) => {
  return `${WORKSPACES}/${workspaceId}/clients`;
};

const workspaceFeed = (workspaceId) => {
  return `${WORKSPACES}/${workspaceId}/activity`;
};

const createClient = async (agent, workspaceId, body = {}) => {
  return agent.post(clientsUrl(workspaceId)).send({ companyName: "Northwind Studio", ...body });
};

const actionsOf = (res) => {
  return res.body.activity.map((event) => {
    return event.action;
  });
};

describe("recording client activity", () => {
  it("records who created a client", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const created = await createClient(owner.agent, workspaceId);
    const id = created.body.client.id;
    const feed = await owner.agent.get(`${clientsUrl(workspaceId)}/${id}/activity`);

    expect(feed.status).toBe(200);
    expect(feed.body.activity).toHaveLength(1);
    expect(feed.body.activity[0]).toMatchObject({
      action: "client.created",
      entityType: "client",
      entityId: id,
      clientId: id,
      metadata: { name: "Northwind Studio" },
      actor: { id: owner.res.body.user.id, name: "Test User" },
    });
  });

  it("records which fields changed, but never their values", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const created = await createClient(owner.agent, workspaceId);
    const id = created.body.client.id;

    await owner.agent.patch(`${clientsUrl(workspaceId)}/${id}`).send({
      companyName: "Northwind Group",
      status: "active",
      notesInternal: "Very secret note",
    });

    const feed = await owner.agent.get(`${clientsUrl(workspaceId)}/${id}/activity`);
    const event = feed.body.activity[0];

    expect(event.action).toBe("client.updated");
    expect(event.metadata.fields.sort()).toEqual(["companyName", "notesInternal", "status"]);
    expect(event.metadata.status).toEqual({ from: "lead", to: "active" });
    expect(event.metadata.previousName).toBe("Northwind Studio");
    expect(event.metadata.name).toBe("Northwind Group");
    expect(JSON.stringify(event.metadata)).not.toContain("Very secret note");
  });

  it("records nothing for an edit that changes nothing", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const created = await createClient(owner.agent, workspaceId);
    const id = created.body.client.id;
    const res = await owner.agent
      .patch(`${clientsUrl(workspaceId)}/${id}`)
      .send({ companyName: "Northwind Studio", status: "lead", taxId: "" });

    expect(res.status).toBe(200);

    const feed = await owner.agent.get(`${clientsUrl(workspaceId)}/${id}/activity`);

    expect(actionsOf(feed)).toEqual(["client.created"]);
  });

  it("records archive and restore, newest first, and ignores repeats", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const created = await createClient(owner.agent, workspaceId);
    const id = created.body.client.id;
    const url = clientsUrl(workspaceId);

    await owner.agent.post(`${url}/${id}/archive`);
    await owner.agent.post(`${url}/${id}/archive`);
    await owner.agent.post(`${url}/${id}/restore`);

    const feed = await owner.agent.get(`${url}/${id}/activity`);

    expect(actionsOf(feed)).toEqual(["client.restored", "client.archived", "client.created"]);
  });

  it("records nothing when the change fails", async () => {
    const { owner, workspaceId } = await createWorkspace();

    await createClient(owner.agent, workspaceId);

    const duplicate = await createClient(owner.agent, workspaceId);
    const feed = await owner.agent.get(workspaceFeed(workspaceId));

    expect(duplicate.status).toBe(409);
    expect(actionsOf(feed)).toEqual(["client.created"]);
  });
});

describe("reading the feeds", () => {
  it("shows a client's own history in its feed and everything in the workspace feed", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const first = await createClient(owner.agent, workspaceId, { companyName: "A" });

    await createClient(owner.agent, workspaceId, { companyName: "B" });
    await owner.agent
      .patch(`${clientsUrl(workspaceId)}/${first.body.client.id}`)
      .send({ status: "active" });

    const own = await owner.agent.get(
      `${clientsUrl(workspaceId)}/${first.body.client.id}/activity`,
    );
    const all = await owner.agent.get(workspaceFeed(workspaceId));
    const paged = await owner.agent.get(`${workspaceFeed(workspaceId)}?pageSize=2`);

    expect(actionsOf(own)).toEqual(["client.updated", "client.created"]);
    expect(all.body.activity).toHaveLength(3);
    expect(paged.body.activity).toHaveLength(2);
    expect(paged.body.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
  });

  for (const role of ["owner", "admin", "member", "client"]) {
    const allowed = role !== "client";

    it(`${role} ${allowed ? "can" : "cannot"} read the feeds`, async () => {
      const { owner, workspaceId } = await createWorkspace();
      const user = role === "owner" ? owner : await addMemberTo(workspaceId, role);
      const created = await createClient(owner.agent, workspaceId);
      const clientFeed = `${clientsUrl(workspaceId)}/${created.body.client.id}/activity`;

      for (const url of [clientFeed, workspaceFeed(workspaceId)]) {
        const res = await user.agent.get(url);

        expect(res.status).toBe(allowed ? 200 : 403);
      }
    });
  }

  it("keeps one workspace's history away from another", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await createWorkspace("Beta");
    const secret = await createClient(beta.owner.agent, beta.workspaceId);
    const res = await alpha.owner.agent.get(
      `${clientsUrl(alpha.workspaceId)}/${secret.body.client.id}/activity`,
    );
    const feed = await alpha.owner.agent.get(workspaceFeed(alpha.workspaceId));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CLIENT_NOT_FOUND");
    expect(feed.body.activity).toEqual([]);
    expect(feed.body.meta.total).toBe(0);
  });
});
