import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const makeClient = async (owner, workspaceId, companyName) => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

const makeProject = async (owner, workspaceId, clientId, name) => {
  const res = await owner.agent.post(`${base(workspaceId)}/projects`).send({ clientId, name });

  return res.body.project.id;
};

const addTask = async (workspaceId, projectId, fields = {}) => {
  const [row] = await db("tasks")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title: "Homepage",
      status: "in_progress",
      client_visible: true,
      position: 1000,
      ...fields,
    })
    .returning("id");

  return row.id;
};

const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Notify Events");
  const clientId = await makeClient(owner, workspaceId, "Alpha Co");
  const projectId = await makeProject(owner, workspaceId, clientId, "Alpha site");
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/access`)
    .send({ userId: person.res.body.user.id });

  return { owner, workspaceId, clientId, projectId, person };
};

const inbox = async (agent, workspaceId) => {
  const res = await agent.get(`${base(workspaceId)}/notifications`);

  return res.body;
};

describe("notification events", () => {
  it("tells the client about the team's messages, but not internal notes", async () => {
    const { owner, workspaceId, clientId, person } = await setup();
    const url = `${base(workspaceId)}/clients/${clientId}/messages`;

    await owner.agent.post(url).send({ body: "Hello there" });
    await owner.agent.post(url).send({ body: "Watch the budget", internal: true });

    const result = await inbox(person.agent, workspaceId);

    expect(result.total).toBe(1);
    expect(result.notifications[0].kind).toBe("message");
    expect(result.notifications[0].data.clientName).toBe("Alpha Co");
    expect(result.notifications[0].data.actorName).toBeTruthy();
  });

  it("tells the team about a client's message, but not the client or unrelated members", async () => {
    const { owner, workspaceId, clientId, person } = await setup();
    const bystander = await addMemberTo(workspaceId, "member");

    await person.agent
      .post(`${base(workspaceId)}/portal/clients/${clientId}/messages`)
      .send({ body: "Looks good" });

    const forOwner = await inbox(owner.agent, workspaceId);
    const forClient = await inbox(person.agent, workspaceId);
    const forBystander = await inbox(bystander.agent, workspaceId);

    expect(forOwner.total).toBe(1);
    expect(forOwner.notifications[0].kind).toBe("message");
    expect(forClient.total).toBe(0);
    expect(forBystander.total).toBe(0);
  });

  it("tells the client when a shared task is moved to In review", async () => {
    const { owner, workspaceId, projectId, person } = await setup();
    const shared = await addTask(workspaceId, projectId, { title: "Shared one" });
    const hidden = await addTask(workspaceId, projectId, {
      title: "Hidden one",
      client_visible: false,
    });
    const move = (taskId) => {
      return owner.agent
        .post(`${base(workspaceId)}/projects/${projectId}/tasks/${taskId}/move`)
        .send({ status: "in_review", afterTaskId: null });
    };

    await move(shared);
    await move(hidden);

    const result = await inbox(person.agent, workspaceId);

    expect(result.total).toBe(1);
    expect(result.notifications[0].kind).toBe("review_requested");
    expect(result.notifications[0].data.taskTitle).toBe("Shared one");
    expect(result.notifications[0].projectId).toBe(projectId);
  });

  it("tells the client when a task that's already In review gets shared", async () => {
    const { owner, workspaceId, projectId, person } = await setup();
    const taskId = await addTask(workspaceId, projectId, {
      status: "in_review",
      client_visible: false,
    });

    await owner.agent
      .patch(`${base(workspaceId)}/projects/${projectId}/tasks/${taskId}`)
      .send({ clientVisible: true });

    const result = await inbox(person.agent, workspaceId);

    expect(result.total).toBe(1);
    expect(result.notifications[0].kind).toBe("review_requested");
  });

  it("tells the team when a client decides, without the comment", async () => {
    const { owner, workspaceId, projectId, person } = await setup();
    const taskId = await addTask(workspaceId, projectId, { status: "in_review" });

    await person.agent
      .post(`${base(workspaceId)}/portal/tasks/${taskId}/review`)
      .send({ decision: "changes_requested", comment: "Secret reasoning" });

    const forOwner = await inbox(owner.agent, workspaceId);
    const forClient = await inbox(person.agent, workspaceId);

    expect(forOwner.total).toBe(1);
    expect(forOwner.notifications[0].kind).toBe("review_decided");
    expect(forOwner.notifications[0].data.decision).toBe("changes_requested");
    expect(JSON.stringify(forOwner.notifications[0])).not.toContain("Secret reasoning");
    expect(forClient.total).toBe(0);
  });
});
