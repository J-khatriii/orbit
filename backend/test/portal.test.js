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

const addTask = async (workspaceId, projectId, fields) => {
  const done = fields.status === "done";

  await db("tasks").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    title: "A task",
    client_visible: false,
    completed_at: done ? db.fn.now() : null,
    ...fields,
  });
};

const giveAccess = async (owner, workspaceId, clientId, person) => {
  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/access`)
    .send({ userId: person.res.body.user.id });
};

// Two clients with a project each, and a client user who can see the first one only.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Portal Studio");
  const clientA = await makeClient(owner, workspaceId, "Alpha Co");
  const clientB = await makeClient(owner, workspaceId, "Beta Co");
  const projectA = await makeProject(owner, workspaceId, clientA, "Alpha site");
  const projectB = await makeProject(owner, workspaceId, clientB, "Beta site");
  const person = await addMemberTo(workspaceId, "client");

  await giveAccess(owner, workspaceId, clientA, person);

  return { owner, workspaceId, clientA, projectA, projectB, person };
};

describe("client portal", () => {
  it("lists only the projects of clients the person can access", async () => {
    const { workspaceId, projectA, person } = await setup();

    const res = await person.agent.get(`${base(workspaceId)}/portal/projects`);

    expect(res.status).toBe(200);
    expect(
      res.body.projects.map((project) => {
        return project.id;
      }),
    ).toEqual([projectA]);
    expect(res.body.projects[0].clientName).toBe("Alpha Co");
  });

  it("counts only client-visible tasks in a project's progress", async () => {
    const { workspaceId, projectA, person } = await setup();

    await addTask(workspaceId, projectA, { client_visible: true });
    await addTask(workspaceId, projectA, { client_visible: true, status: "done" });
    await addTask(workspaceId, projectA, { client_visible: false });

    const res = await person.agent.get(`${base(workspaceId)}/portal/projects`);

    expect(res.body.projects[0].taskCount).toBe(2);
    expect(res.body.projects[0].tasksDone).toBe(1);
  });

  it("shows visible tasks and nothing internal", async () => {
    const { workspaceId, projectA, person } = await setup();

    await addTask(workspaceId, projectA, { title: "Shown", client_visible: true });
    await addTask(workspaceId, projectA, { title: "Hidden", client_visible: false });

    const res = await person.agent.get(`${base(workspaceId)}/portal/projects/${projectA}`);

    expect(res.status).toBe(200);
    expect(
      res.body.tasks.map((task) => {
        return task.title;
      }),
    ).toEqual(["Shown"]);
    expect(Object.keys(res.body.tasks[0]).sort()).toEqual([
      "completedAt",
      "description",
      "dueDate",
      "id",
      "status",
      "title",
    ]);
    expect(Object.keys(res.body.project).sort()).toEqual([
      "clientId",
      "clientName",
      "dueDate",
      "id",
      "name",
      "startDate",
      "status",
      "taskCount",
      "tasksDone",
    ]);
  });

  it("answers 404 for another client's project", async () => {
    const { workspaceId, projectB, person } = await setup();

    const res = await person.agent.get(`${base(workspaceId)}/portal/projects/${projectB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("shows nothing to a client user with no access", async () => {
    const { workspaceId } = await setup();
    const stranger = await addMemberTo(workspaceId, "client");

    const res = await stranger.agent.get(`${base(workspaceId)}/portal/projects`);

    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
  });

  it("refuses team roles", async () => {
    const { owner, workspaceId } = await setup();
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");

    for (const who of [owner, admin, member]) {
      const res = await who.agent.get(`${base(workspaceId)}/portal/projects`);

      expect(res.status).toBe(403);
    }
  });

  it("hides the workspace from outsiders", async () => {
    const { workspaceId } = await setup();
    const other = await createWorkspace("Outside");

    const res = await other.owner.agent.get(`${base(workspaceId)}/portal/projects`);

    expect(res.status).toBe(404);
  });

  it("stops showing a project once access is removed", async () => {
    const { owner, workspaceId, clientA, projectA, person } = await setup();

    await owner.agent.delete(
      `${base(workspaceId)}/clients/${clientA}/access/${person.res.body.user.id}`,
    );

    const list = await person.agent.get(`${base(workspaceId)}/portal/projects`);
    const detail = await person.agent.get(`${base(workspaceId)}/portal/projects/${projectA}`);

    expect(list.body.projects).toEqual([]);
    expect(detail.status).toBe(404);
  });

  it("answers 404 for a project that doesn't exist", async () => {
    const { workspaceId, person } = await setup();
    const missing = "00000000-0000-4000-8000-000000000000";

    const res = await person.agent.get(`${base(workspaceId)}/portal/projects/${missing}`);

    expect(res.status).toBe(404);
  });
});
