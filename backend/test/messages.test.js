import { describe, expect, it } from "vitest";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const makeClient = async (owner, workspaceId, companyName = "Acme Co") => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

const makeProject = async (owner, workspaceId, clientId, name = "Website") => {
  const res = await owner.agent.post(`${base(workspaceId)}/projects`).send({ clientId, name });

  return res.body.project.id;
};

const url = (workspaceId, clientId) => {
  return `${base(workspaceId)}/clients/${clientId}/messages`;
};

describe("client messages", () => {
  it("lets a team member post and shows it to the team with the author", async () => {
    const { owner, workspaceId } = await createWorkspace("Message Studio");
    const clientId = await makeClient(owner, workspaceId);
    const member = await addMemberTo(workspaceId, "member");

    const posted = await member.agent
      .post(url(workspaceId, clientId))
      .send({ body: "  Kickoff is on Monday.  " });

    expect(posted.status).toBe(201);
    expect(posted.body.message.body).toBe("Kickoff is on Monday.");
    expect(posted.body.message.internal).toBe(false);
    expect(posted.body.message.author.id).toBe(member.res.body.user.id);

    const list = await owner.agent.get(url(workspaceId, clientId));

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.messages[0].body).toBe("Kickoff is on Monday.");
  });

  it("stores the internal flag", async () => {
    const { owner, workspaceId } = await createWorkspace("Internal Notes");
    const clientId = await makeClient(owner, workspaceId);

    const posted = await owner.agent
      .post(url(workspaceId, clientId))
      .send({ body: "Budget is tight. Don't promise extras.", internal: true });

    expect(posted.status).toBe(201);
    expect(posted.body.message.internal).toBe(true);
  });

  it("refuses client-role users", async () => {
    const { owner, workspaceId } = await createWorkspace("No Clients Here");
    const clientId = await makeClient(owner, workspaceId);
    const person = await addMemberTo(workspaceId, "client");

    expect((await person.agent.get(url(workspaceId, clientId))).status).toBe(403);
    expect(
      (await person.agent.post(url(workspaceId, clientId)).send({ body: "Hello" })).status,
    ).toBe(403);
  });

  it("hides the conversation from outsiders", async () => {
    const { owner, workspaceId } = await createWorkspace("Inside");
    const clientId = await makeClient(owner, workspaceId);
    const other = await createWorkspace("Outside");

    const res = await other.owner.agent.get(url(workspaceId, clientId));

    expect(res.status).toBe(404);
  });

  it("rejects an empty message", async () => {
    const { owner, workspaceId } = await createWorkspace("Empty");
    const clientId = await makeClient(owner, workspaceId);

    const res = await owner.agent.post(url(workspaceId, clientId)).send({ body: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.body).toBeTruthy();
  });

  it("only accepts a project that belongs to this client", async () => {
    const { owner, workspaceId } = await createWorkspace("Wrong Project");
    const clientId = await makeClient(owner, workspaceId);
    const otherClientId = await makeClient(owner, workspaceId, "Other Co");
    const foreignProject = await makeProject(owner, workspaceId, otherClientId);

    const res = await owner.agent
      .post(url(workspaceId, clientId))
      .send({ body: "About the site", projectId: foreignProject });

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.projectId).toBeTruthy();
  });

  it("tags a message with its project and can filter by it", async () => {
    const { owner, workspaceId } = await createWorkspace("Tagged");
    const clientId = await makeClient(owner, workspaceId);
    const projectId = await makeProject(owner, workspaceId, clientId, "Brand refresh");

    await owner.agent.post(url(workspaceId, clientId)).send({ body: "General note" });
    const tagged = await owner.agent
      .post(url(workspaceId, clientId))
      .send({ body: "About the brand work", projectId });

    expect(tagged.status).toBe(201);
    expect(tagged.body.message.projectName).toBe("Brand refresh");

    const filtered = await owner.agent.get(`${url(workspaceId, clientId)}?projectId=${projectId}`);

    expect(filtered.body.total).toBe(1);
    expect(filtered.body.messages[0].body).toBe("About the brand work");
  });

  it("lists newest first and pages through the conversation", async () => {
    const { owner, workspaceId } = await createWorkspace("Paging");
    const clientId = await makeClient(owner, workspaceId);

    for (const body of ["one", "two", "three"]) {
      await owner.agent.post(url(workspaceId, clientId)).send({ body });
    }

    const first = await owner.agent.get(`${url(workspaceId, clientId)}?pageSize=2`);
    const second = await owner.agent.get(`${url(workspaceId, clientId)}?pageSize=2&page=2`);

    expect(first.body.total).toBe(3);
    expect(
      first.body.messages.map((message) => {
        return message.body;
      }),
    ).toEqual(["three", "two"]);
    expect(
      second.body.messages.map((message) => {
        return message.body;
      }),
    ).toEqual(["one"]);
  });

  it("returns 404 for a client that isn't in this workspace", async () => {
    const { owner, workspaceId } = await createWorkspace("Missing Client");
    const missing = "00000000-0000-4000-8000-000000000000";

    const res = await owner.agent.get(url(workspaceId, missing));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CLIENT_NOT_FOUND");
  });
});
