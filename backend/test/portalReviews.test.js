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
      title: "Review me",
      status: "in_review",
      client_visible: true,
      position: 1000,
      ...fields,
    })
    .returning("id");

  return row.id;
};

// Two clients with a project each, and a client user who can reach the first one only.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Review Studio");
  const clientA = await makeClient(owner, workspaceId, "Alpha Co");
  const clientB = await makeClient(owner, workspaceId, "Beta Co");
  const projectA = await makeProject(owner, workspaceId, clientA, "Alpha site");
  const projectB = await makeProject(owner, workspaceId, clientB, "Beta site");
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientA}/access`)
    .send({ userId: person.res.body.user.id });

  return { owner, workspaceId, projectA, projectB, person };
};

const review = (agent, workspaceId, taskId, body) => {
  return agent.post(`${base(workspaceId)}/portal/tasks/${taskId}/review`).send(body);
};

describe("client reviews", () => {
  it("approves a task: it moves to Done and the decision is kept", async () => {
    const { owner, workspaceId, projectA, person } = await setup();
    const taskId = await addTask(workspaceId, projectA);

    const res = await review(person.agent, workspaceId, taskId, { decision: "approved" });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe("done");
    expect(res.body.task.completedAt).toBeTruthy();

    const history = await owner.agent.get(
      `${base(workspaceId)}/projects/${projectA}/tasks/${taskId}/reviews`,
    );

    expect(history.status).toBe(200);
    expect(history.body.reviews).toHaveLength(1);
    expect(history.body.reviews[0].decision).toBe("approved");
  });

  it("requests changes: the comment is kept and the task goes back to In progress", async () => {
    const { owner, workspaceId, projectA, person } = await setup();
    const taskId = await addTask(workspaceId, projectA);

    const res = await review(person.agent, workspaceId, taskId, {
      decision: "changes_requested",
      comment: "  Please use our blue.  ",
    });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe("in_progress");
    expect(res.body.task.completedAt).toBeNull();

    const history = await owner.agent.get(
      `${base(workspaceId)}/projects/${projectA}/tasks/${taskId}/reviews`,
    );

    expect(history.body.reviews[0].decision).toBe("changes_requested");
    expect(history.body.reviews[0].comment).toBe("Please use our blue.");
  });

  it("needs a comment to ask for changes, and leaves the task alone", async () => {
    const { workspaceId, projectA, person } = await setup();
    const taskId = await addTask(workspaceId, projectA);

    const res = await review(person.agent, workspaceId, taskId, {
      decision: "changes_requested",
    });
    const task = await db("tasks").where({ id: taskId }).first();

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.comment).toBeTruthy();
    expect(task.status).toBe("in_review");
  });

  it("refuses a task that isn't waiting for review", async () => {
    const { workspaceId, projectA, person } = await setup();
    const taskId = await addTask(workspaceId, projectA, { status: "in_progress" });

    const res = await review(person.agent, workspaceId, taskId, { decision: "approved" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TASK_NOT_IN_REVIEW");
  });

  it("refuses a second decision on the same task", async () => {
    const { workspaceId, projectA, person } = await setup();
    const taskId = await addTask(workspaceId, projectA);

    await review(person.agent, workspaceId, taskId, { decision: "approved" });
    const again = await review(person.agent, workspaceId, taskId, { decision: "approved" });

    expect(again.status).toBe(409);
  });

  it("answers 404 for a task that isn't shared with clients", async () => {
    const { workspaceId, projectA, person } = await setup();
    const taskId = await addTask(workspaceId, projectA, { client_visible: false });

    const res = await review(person.agent, workspaceId, taskId, { decision: "approved" });

    expect(res.status).toBe(404);
  });

  it("answers 404 for another client's task", async () => {
    const { workspaceId, projectB, person } = await setup();
    const taskId = await addTask(workspaceId, projectB);

    const res = await review(person.agent, workspaceId, taskId, { decision: "approved" });
    const task = await db("tasks").where({ id: taskId }).first();

    expect(res.status).toBe(404);
    expect(task.status).toBe("in_review");
  });

  it("refuses team roles on the review route", async () => {
    const { owner, workspaceId, projectA } = await setup();
    const taskId = await addTask(workspaceId, projectA);
    const member = await addMemberTo(workspaceId, "member");

    for (const who of [owner, member]) {
      const res = await review(who.agent, workspaceId, taskId, { decision: "approved" });

      expect(res.status).toBe(403);
    }
  });
});
