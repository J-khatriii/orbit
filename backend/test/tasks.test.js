import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const idOf = (user) => {
  return user.res.body.user.id;
};

// A workspace with an owner, a client and a project, ready for tasks.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace();
  const base = `${WS}/${workspaceId}`;
  const client = await owner.agent
    .post(`${base}/clients`)
    .send({ companyName: "Northwind Studio" });
  const project = await owner.agent
    .post(`${base}/projects`)
    .send({ clientId: client.body.client.id, name: "Website redesign" });
  const projectId = project.body.project.id;

  return { owner, workspaceId, base, projectId, url: `${base}/projects/${projectId}/tasks` };
};

const addTask = async (agent, url, body = {}) => {
  return agent.post(url).send({ title: "Write brief", ...body });
};

const putOnTeam = async (ctx, user) => {
  return ctx.owner.agent
    .post(`${ctx.base}/projects/${ctx.projectId}/members`)
    .send({ userId: idOf(user) });
};

const titlesOf = (res) => {
  return res.body.tasks.map((task) => {
    return task.title;
  });
};

describe("creating tasks", () => {
  it("fills in the defaults and stacks new tasks at the bottom of their column", async () => {
    const { owner, projectId, url } = await setup();
    const first = await addTask(owner.agent, url, { title: "  Write brief  " });
    const second = await addTask(owner.agent, url, { title: "Wireframes" });
    const review = await addTask(owner.agent, url, { title: "Ship", status: "in_review" });

    expect(first.status).toBe(201);
    expect(first.body.task).toMatchObject({
      projectId,
      title: "Write brief",
      description: null,
      status: "todo",
      priority: "medium",
      assigneeId: null,
      assignee: null,
      dueDate: null,
      position: 1000,
      clientVisible: false,
      completedAt: null,
    });
    expect(second.body.task.position).toBe(2000);
    expect(review.body.task).toMatchObject({ status: "in_review", position: 1000 });
  });

  it("saves every field, and stamps a task created as done", async () => {
    const { owner, url } = await setup();
    const res = await addTask(owner.agent, url, {
      description: "  Two pages  ",
      status: "done",
      priority: "high",
      dueDate: "2026-12-01",
      clientVisible: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      description: "Two pages",
      status: "done",
      priority: "high",
      dueDate: "2026-12-01",
      clientVisible: true,
    });
    expect(res.body.task.completedAt).not.toBeNull();
  });

  it("rejects bad input with a message for the field", async () => {
    const { owner, url } = await setup();
    const cases = [
      [{ title: "" }, "title"],
      [{ title: "x".repeat(201) }, "title"],
      [{ status: "banana" }, "status"],
      [{ priority: "huge" }, "priority"],
      [{ dueDate: "2026-02-31" }, "dueDate"],
      [{ assigneeId: "not-a-uuid" }, "assigneeId"],
    ];

    for (const [body, field] of cases) {
      const res = await addTask(owner.agent, url, body);

      expect(res.status, field).toBe(400);
      expect(res.body.error.code, field).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.fields[field], field).toBeDefined();
    }

    // Fields we don't know about, like a hand-picked position, are refused too.
    expect((await addTask(owner.agent, url, { position: 5 })).status).toBe(400);
  });
});

describe("assignees", () => {
  it("only accepts people on the project's team, and lets you unassign", async () => {
    const ctx = await setup();
    const member = await addMemberTo(ctx.workspaceId, "member");
    const refused = await addTask(ctx.owner.agent, ctx.url, { assigneeId: idOf(member) });

    expect(refused.status).toBe(400);
    expect(refused.body.error.details.fields.assigneeId).toBeDefined();

    await putOnTeam(ctx, member);

    const created = await addTask(ctx.owner.agent, ctx.url, { assigneeId: idOf(member) });
    const taskUrl = `${ctx.url}/${created.body.task.id}`;

    expect(created.status).toBe(201);
    expect(created.body.task.assignee).toMatchObject({ id: idOf(member), name: "Test User" });

    const cleared = await ctx.owner.agent.patch(taskUrl).send({ assigneeId: null });

    expect(cleared.body.task.assignee).toBeNull();

    await ctx.owner.agent.patch(taskUrl).send({ assigneeId: idOf(member) });

    const blank = await ctx.owner.agent.patch(taskUrl).send({ assigneeId: "" });

    expect(blank.body.task.assigneeId).toBeNull();
  });

  it("keeps a task but clears its assignee when that person leaves the team", async () => {
    const ctx = await setup();
    const member = await addMemberTo(ctx.workspaceId, "member");

    await putOnTeam(ctx, member);

    const created = await addTask(ctx.owner.agent, ctx.url, { assigneeId: idOf(member) });
    const removal = await ctx.owner.agent.delete(
      `${ctx.base}/projects/${ctx.projectId}/members/${idOf(member)}`,
    );
    const after = await ctx.owner.agent.get(`${ctx.url}/${created.body.task.id}`);

    expect(removal.status).toBe(200);
    expect(after.status).toBe(200);
    expect(after.body.task.assigneeId).toBeNull();
    expect(after.body.task.title).toBe("Write brief");
  });
});

describe("editing tasks", () => {
  it("changes fields without moving the task, and refuses an empty edit", async () => {
    const { owner, url } = await setup();
    const created = await addTask(owner.agent, url);
    const taskUrl = `${url}/${created.body.task.id}`;
    const res = await owner.agent.patch(taskUrl).send({
      title: "Write the brief",
      priority: "urgent",
      dueDate: "2026-12-05",
      clientVisible: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({
      title: "Write the brief",
      priority: "urgent",
      dueDate: "2026-12-05",
      clientVisible: true,
      status: "todo",
      position: 1000,
    });

    const empty = await owner.agent.patch(taskUrl).send({});

    expect(empty.status).toBe(400);
  });

  it("puts a task at the bottom of a new column and tracks its completion time", async () => {
    const { owner, url } = await setup();
    const a = await addTask(owner.agent, url, { title: "A" });
    await addTask(owner.agent, url, { title: "B" });
    await addTask(owner.agent, url, { title: "C", status: "in_progress" });
    const taskUrl = `${url}/${a.body.task.id}`;

    const started = await owner.agent.patch(taskUrl).send({ status: "in_progress" });

    expect(started.body.task).toMatchObject({ status: "in_progress", position: 2000 });
    expect(started.body.task.completedAt).toBeNull();

    const finished = await owner.agent.patch(taskUrl).send({ status: "done" });

    expect(finished.body.task).toMatchObject({ status: "done", position: 1000 });
    expect(finished.body.task.completedAt).not.toBeNull();

    const reopened = await owner.agent.patch(taskUrl).send({ status: "todo" });

    expect(reopened.body.task.completedAt).toBeNull();

    const same = await owner.agent.patch(taskUrl).send({ status: "todo" });

    expect(same.body.task.position).toBe(reopened.body.task.position);
  });
});

describe("moving tasks on the board", () => {
  const threeTasks = async () => {
    const ctx = await setup();
    const ids = [];

    for (const title of ["A", "B", "C"]) {
      const res = await addTask(ctx.owner.agent, ctx.url, { title });

      ids.push(res.body.task.id);
    }

    return { ...ctx, ids };
  };

  it("drops a task between two others", async () => {
    const { owner, url, ids } = await threeTasks();
    const res = await owner.agent
      .post(`${url}/${ids[2]}/move`)
      .send({ status: "todo", afterTaskId: ids[0] });

    expect(res.status).toBe(200);
    expect(res.body.task.position).toBe(1500);
    expect(titlesOf(await owner.agent.get(url))).toEqual(["A", "C", "B"]);
  });

  it("drops a task at the top of a column", async () => {
    const { owner, url, ids } = await threeTasks();
    const res = await owner.agent
      .post(`${url}/${ids[2]}/move`)
      .send({ status: "todo", afterTaskId: null });

    expect(res.body.task.position).toBe(0);
    expect(titlesOf(await owner.agent.get(url))).toEqual(["C", "A", "B"]);
  });

  it("moves a task to another column and tracks its completion time", async () => {
    const { owner, url, ids } = await threeTasks();
    const done = await owner.agent
      .post(`${url}/${ids[0]}/move`)
      .send({ status: "done", afterTaskId: null });

    expect(done.body.task).toMatchObject({ status: "done", position: 1000 });
    expect(done.body.task.completedAt).not.toBeNull();

    const back = await owner.agent
      .post(`${url}/${ids[0]}/move`)
      .send({ status: "todo", afterTaskId: ids[1] });

    expect(back.body.task.status).toBe("todo");
    expect(back.body.task.completedAt).toBeNull();
    expect(titlesOf(await owner.agent.get(url))).toEqual(["B", "A", "C"]);
  });

  it("respaces a column when two neighbours have no room between them", async () => {
    const { owner, url, ids } = await threeTasks();

    await db("tasks").where({ id: ids[0] }).update({ position: 1000 });
    await db("tasks").where({ id: ids[1] }).update({ position: 1001 });
    await db("tasks").where({ id: ids[2] }).update({ position: 5000 });

    const res = await owner.agent
      .post(`${url}/${ids[2]}/move`)
      .send({ status: "todo", afterTaskId: ids[0] });
    const list = await owner.agent.get(url);
    const positions = list.body.tasks.map((task) => {
      return task.position;
    });

    expect(res.status).toBe(200);
    expect(titlesOf(list)).toEqual(["A", "C", "B"]);
    expect(res.body.task.position).toBe(1500);
    expect(positions).toEqual(
      [...positions].sort((x, y) => {
        return x - y;
      }),
    );
  });

  it("refuses a drop target that isn't in the column, and a bad column", async () => {
    const { owner, url, ids } = await threeTasks();
    const inOtherColumn = await addTask(owner.agent, url, { title: "D", status: "done" });
    const targets = [
      MISSING_ID,
      inOtherColumn.body.task.id,
      // A task can't be dropped after itself.
      ids[2],
    ];

    for (const afterTaskId of targets) {
      const res = await owner.agent
        .post(`${url}/${ids[2]}/move`)
        .send({ status: "todo", afterTaskId });

      expect(res.status).toBe(400);
      expect(res.body.error.details.fields.afterTaskId).toBeDefined();
    }

    const badColumn = await owner.agent
      .post(`${url}/${ids[2]}/move`)
      .send({ status: "banana", afterTaskId: null });

    expect(badColumn.status).toBe(400);
  });
});

describe("listing, reading and deleting", () => {
  it("lists by column then order, and filters by status and assignee", async () => {
    const ctx = await setup();
    const member = await addMemberTo(ctx.workspaceId, "member");

    await putOnTeam(ctx, member);
    await addTask(ctx.owner.agent, ctx.url, { title: "T1" });
    await addTask(ctx.owner.agent, ctx.url, { title: "T2", status: "done" });
    await addTask(ctx.owner.agent, ctx.url, { title: "T3", status: "in_progress" });
    await addTask(ctx.owner.agent, ctx.url, { title: "T4", assigneeId: idOf(member) });

    expect(titlesOf(await ctx.owner.agent.get(ctx.url))).toEqual(["T1", "T4", "T3", "T2"]);
    expect(titlesOf(await ctx.owner.agent.get(`${ctx.url}?status=todo`))).toEqual(["T1", "T4"]);
    expect(titlesOf(await ctx.owner.agent.get(`${ctx.url}?assigneeId=${idOf(member)}`))).toEqual([
      "T4",
    ]);
    expect((await ctx.owner.agent.get(`${ctx.url}?status=banana`)).status).toBe(400);
  });

  it("deletes a task for good", async () => {
    const { owner, url } = await setup();
    const created = await addTask(owner.agent, url);
    const taskUrl = `${url}/${created.body.task.id}`;
    const removed = await owner.agent.delete(taskUrl);

    expect(removed.status).toBe(204);

    const gone = await owner.agent.get(taskUrl);

    expect(gone.status).toBe(404);
    expect(gone.body.error.code).toBe("TASK_NOT_FOUND");
    expect((await owner.agent.delete(taskUrl)).status).toBe(404);
  });

  it("won't reach a task through a different project", async () => {
    const ctx = await setup();
    const other = await ctx.owner.agent
      .post(`${ctx.base}/clients`)
      .send({ companyName: "Harbor & Co" });
    const otherProject = await ctx.owner.agent
      .post(`${ctx.base}/projects`)
      .send({ clientId: other.body.client.id, name: "Packaging" });
    const created = await addTask(ctx.owner.agent, ctx.url);
    const res = await ctx.owner.agent.get(
      `${ctx.base}/projects/${otherProject.body.project.id}/tasks/${created.body.task.id}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TASK_NOT_FOUND");
  });
});

describe("guards", () => {
  it("lets you read an archived project's tasks but not change them", async () => {
    const ctx = await setup();
    const created = await addTask(ctx.owner.agent, ctx.url);
    const taskUrl = `${ctx.url}/${created.body.task.id}`;

    await ctx.owner.agent.post(`${ctx.base}/projects/${ctx.projectId}/archive`);

    const attempts = [
      await addTask(ctx.owner.agent, ctx.url),
      await ctx.owner.agent.patch(taskUrl).send({ title: "New title" }),
      await ctx.owner.agent.post(`${taskUrl}/move`).send({ status: "done", afterTaskId: null }),
      await ctx.owner.agent.delete(taskUrl),
    ];

    for (const res of attempts) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("PROJECT_ARCHIVED");
    }

    expect((await ctx.owner.agent.get(taskUrl)).status).toBe(200);
    expect((await ctx.owner.agent.get(ctx.url)).status).toBe(200);

    await ctx.owner.agent.post(`${ctx.base}/projects/${ctx.projectId}/restore`);

    expect((await addTask(ctx.owner.agent, ctx.url)).status).toBe(201);
  });

  it("answers 404 for a missing or malformed project or task", async () => {
    const { owner, base, url } = await setup();
    const missingProject = await owner.agent.get(`${base}/projects/${MISSING_ID}/tasks`);

    expect(missingProject.status).toBe(404);
    expect(missingProject.body.error.code).toBe("PROJECT_NOT_FOUND");
    expect((await owner.agent.get(`${base}/projects/not-a-uuid/tasks`)).status).toBe(404);

    for (const id of [MISSING_ID, "not-a-uuid"]) {
      const res = await owner.agent.get(`${url}/${id}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TASK_NOT_FOUND");
    }
  });

  it("never reaches into another workspace", async () => {
    const mine = await setup();
    const theirs = await setup();
    const created = await addTask(theirs.owner.agent, theirs.url);
    const attempts = [
      await mine.owner.agent.get(`${theirs.url}`),
      await mine.owner.agent.get(`${theirs.url}/${created.body.task.id}`),
      await addTask(mine.owner.agent, theirs.url),
    ];

    for (const res of attempts) {
      expect(res.status).toBe(404);
    }

    // Using my workspace with their project id fails too.
    const mixed = await mine.owner.agent.get(`${mine.base}/projects/${theirs.projectId}/tasks`);

    expect(mixed.status).toBe(404);
    expect(mixed.body.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("is open to team members and closed to client users", async () => {
    const ctx = await setup();
    const member = await addMemberTo(ctx.workspaceId, "member");
    const portalClient = await addMemberTo(ctx.workspaceId, "client");

    expect((await member.agent.get(ctx.url)).status).toBe(200);
    expect((await addTask(member.agent, ctx.url)).status).toBe(201);
    expect((await portalClient.agent.get(ctx.url)).status).toBe(403);
    expect((await addTask(portalClient.agent, ctx.url)).status).toBe(403);
  });
});

const projectFeed = async (ctx) => {
  const res = await ctx.owner.agent.get(
    `${ctx.base}/projects/${ctx.projectId}/activity?pageSize=100`,
  );

  return res.body.activity;
};

describe("task activity", () => {
  it("records who created a task and which fields changed, never the values", async () => {
    const ctx = await setup();
    const created = await addTask(ctx.owner.agent, ctx.url);
    const taskUrl = `${ctx.url}/${created.body.task.id}`;
    const project = await ctx.owner.agent.get(`${ctx.base}/projects/${ctx.projectId}`);
    let feed = await projectFeed(ctx);

    expect(feed[0]).toMatchObject({
      action: "task.created",
      entityType: "task",
      entityId: created.body.task.id,
      projectId: ctx.projectId,
      clientId: project.body.project.clientId,
      metadata: { title: "Write brief", projectName: "Website redesign" },
    });

    await ctx.owner.agent
      .patch(taskUrl)
      .send({ title: "Write the brief", priority: "high", description: "Very secret detail" });
    feed = await projectFeed(ctx);

    expect(feed[0].action).toBe("task.updated");
    expect([...feed[0].metadata.fields].sort()).toEqual(["description", "priority", "title"]);
    expect(feed[0].metadata).toMatchObject({
      title: "Write the brief",
      previousTitle: "Write brief",
    });
    expect(JSON.stringify(feed[0].metadata)).not.toContain("Very secret detail");

    // The same edit again changes nothing, so nothing is recorded.
    const count = feed.length;

    await ctx.owner.agent.patch(taskUrl).send({ title: "Write the brief", priority: "high" });

    expect((await projectFeed(ctx)).length).toBe(count);
  });

  it("records a change of column, but not reordering within a column", async () => {
    const ctx = await setup();
    const a = await addTask(ctx.owner.agent, ctx.url, { title: "A" });
    const b = await addTask(ctx.owner.agent, ctx.url, { title: "B" });
    const taskUrl = `${ctx.url}/${a.body.task.id}`;

    await ctx.owner.agent.patch(taskUrl).send({ status: "done" });

    let feed = await projectFeed(ctx);

    expect(feed[0].metadata).toMatchObject({
      fields: ["status"],
      status: { from: "todo", to: "done" },
    });

    await ctx.owner.agent.post(`${taskUrl}/move`).send({ status: "in_review", afterTaskId: null });
    feed = await projectFeed(ctx);

    expect(feed[0].metadata.status).toEqual({ from: "done", to: "in_review" });

    // B is alone in To do, so putting it "at the top" doesn't change its column.
    const count = feed.length;

    await ctx.owner.agent
      .post(`${ctx.url}/${b.body.task.id}/move`)
      .send({ status: "todo", afterTaskId: null });

    expect((await projectFeed(ctx)).length).toBe(count);
  });

  it("records assigning, unassigning and deleting", async () => {
    const ctx = await setup();
    const member = await addMemberTo(ctx.workspaceId, "member");

    await putOnTeam(ctx, member);

    const created = await addTask(ctx.owner.agent, ctx.url);
    const taskUrl = `${ctx.url}/${created.body.task.id}`;

    await ctx.owner.agent.patch(taskUrl).send({ assigneeId: idOf(member) });

    let feed = await projectFeed(ctx);

    expect(feed[0].metadata).toMatchObject({ fields: ["assigneeId"], assigneeName: "Test User" });

    await ctx.owner.agent.patch(taskUrl).send({ assigneeId: null });
    feed = await projectFeed(ctx);

    expect(feed[0].metadata.assigneeName).toBeNull();

    await ctx.owner.agent.delete(taskUrl);
    feed = await projectFeed(ctx);

    expect(feed[0]).toMatchObject({
      action: "task.deleted",
      entityId: created.body.task.id,
      metadata: { title: "Write brief" },
    });
  });

  it("also shows task events in the client's feed and the workspace feed", async () => {
    const ctx = await setup();
    const project = await ctx.owner.agent.get(`${ctx.base}/projects/${ctx.projectId}`);
    const clientId = project.body.project.clientId;

    await addTask(ctx.owner.agent, ctx.url);

    const clientFeed = await ctx.owner.agent.get(`${ctx.base}/clients/${clientId}/activity`);
    const workspaceFeed = await ctx.owner.agent.get(`${ctx.base}/activity`);

    for (const feed of [clientFeed, workspaceFeed]) {
      const actions = feed.body.activity.map((event) => {
        return event.action;
      });

      expect(actions).toContain("task.created");
      expect(actions).toContain("project.created");
    }
  });
});

describe("task counts on projects", () => {
  it("counts a project's tasks and how many are done", async () => {
    const ctx = await setup();
    const a = await addTask(ctx.owner.agent, ctx.url, { title: "A" });
    const b = await addTask(ctx.owner.agent, ctx.url, { title: "B" });

    await addTask(ctx.owner.agent, ctx.url, { title: "C" });
    await ctx.owner.agent.patch(`${ctx.url}/${a.body.task.id}`).send({ status: "done" });

    const read = async () => {
      const single = await ctx.owner.agent.get(`${ctx.base}/projects/${ctx.projectId}`);
      const list = await ctx.owner.agent.get(`${ctx.base}/projects`);
      const row = list.body.projects.find((project) => {
        return project.id === ctx.projectId;
      });

      return { single: single.body.project, row };
    };

    let { single, row } = await read();

    expect(single).toMatchObject({ taskCount: 3, tasksDone: 1 });
    expect(row).toMatchObject({ taskCount: 3, tasksDone: 1 });

    await ctx.owner.agent.delete(`${ctx.url}/${b.body.task.id}`);
    ({ single, row } = await read());

    expect(single).toMatchObject({ taskCount: 2, tasksDone: 1 });
    expect(row).toMatchObject({ taskCount: 2, tasksDone: 1 });
  });
});
