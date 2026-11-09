import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

// A workspace with an owner and one client.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace();
  const base = `${WS}/${workspaceId}`;
  const client = await owner.agent
    .post(`${base}/clients`)
    .send({ companyName: "Northwind Studio" });

  return { owner, workspaceId, base, clientId: client.body.client.id, url: `${base}/templates` };
};

const makeTemplate = async (agent, url, body = {}) => {
  return agent.post(url).send({
    name: "Website launch",
    description: "Standard launch checklist",
    tasks: [
      { title: "Kickoff call", priority: "high", dueOffsetDays: 0 },
      { title: "Design review", dueOffsetDays: 7 },
      { title: "Launch" },
    ],
    ...body,
  });
};

const makeProject = async (ctx, body = {}) => {
  return ctx.owner.agent
    .post(`${ctx.base}/projects`)
    .send({ clientId: ctx.clientId, name: "Launch", ...body });
};

const tasksOf = async (ctx, projectId) => {
  const res = await ctx.owner.agent.get(`${ctx.base}/projects/${projectId}/tasks`);

  return res.body.tasks;
};

const pick = (items, key) => {
  return items.map((item) => {
    return item[key];
  });
};

describe("creating and reading templates", () => {
  it("saves a template with its tasks in order", async () => {
    const { owner, url } = await setup();
    const res = await makeTemplate(owner.agent, url, { name: "  Website launch  " });

    expect(res.status).toBe(201);
    expect(res.body.template).toMatchObject({
      name: "Website launch",
      description: "Standard launch checklist",
      taskCount: 3,
    });

    const { tasks } = res.body.template;

    expect(pick(tasks, "title")).toEqual(["Kickoff call", "Design review", "Launch"]);
    expect(pick(tasks, "priority")).toEqual(["high", "medium", "medium"]);
    expect(pick(tasks, "dueOffsetDays")).toEqual([0, 7, null]);
    expect(pick(tasks, "position")).toEqual([1000, 2000, 3000]);

    const list = await owner.agent.get(url);
    const one = await owner.agent.get(`${url}/${res.body.template.id}`);

    expect(list.body.templates).toHaveLength(1);
    expect(list.body.templates[0]).toMatchObject({ name: "Website launch", taskCount: 3 });
    expect(list.body.templates[0]).not.toHaveProperty("tasks");
    expect(pick(one.body.template.tasks, "title")).toEqual([
      "Kickoff call",
      "Design review",
      "Launch",
    ]);
  });

  it("rejects bad input", async () => {
    const { owner, url } = await setup();
    const manyTasks = Array.from({ length: 101 }, (unused, index) => {
      return { title: `Task ${index}` };
    });
    const cases = [
      [{ name: "" }, "name"],
      [{ name: "x".repeat(121) }, "name"],
      [{ tasks: [{ title: "" }] }, null],
      [{ tasks: [{ title: "A", priority: "huge" }] }, null],
      [{ tasks: [{ title: "A", dueOffsetDays: -1 }] }, null],
      [{ tasks: [{ title: "A", dueOffsetDays: 1.5 }] }, null],
      [{ tasks: manyTasks }, null],
      [{ tasks: [{ title: "A", status: "done" }] }, null],
      [{ colour: "red" }, null],
    ];

    for (const [body, field] of cases) {
      const res = await makeTemplate(owner.agent, url, body);

      expect(res.status, JSON.stringify(body).slice(0, 60)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");

      if (field) {
        expect(res.body.error.details.fields[field]).toBeDefined();
      }
    }
  });

  it("keeps template names unique, ignoring case", async () => {
    const { owner, url } = await setup();

    await makeTemplate(owner.agent, url);

    const clash = await makeTemplate(owner.agent, url, { name: "website LAUNCH" });

    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe("TEMPLATE_EXISTS");

    const other = await makeTemplate(owner.agent, url, { name: "Other" });
    const rename = await owner.agent
      .patch(`${url}/${other.body.template.id}`)
      .send({ name: "WEBSITE launch" });
    const same = await owner.agent
      .patch(`${url}/${other.body.template.id}`)
      .send({ name: "Other" });

    expect(rename.status).toBe(409);
    expect(same.status).toBe(200);
  });
});

describe("changing templates", () => {
  it("edits the name and description, and replaces the task list only when sent", async () => {
    const { owner, url } = await setup();
    const created = await makeTemplate(owner.agent, url);
    const templateUrl = `${url}/${created.body.template.id}`;

    const renamed = await owner.agent
      .patch(templateUrl)
      .send({ name: "Renamed", description: null });

    expect(renamed.status).toBe(200);
    expect(renamed.body.template).toMatchObject({
      name: "Renamed",
      description: null,
      taskCount: 3,
    });

    const replaced = await owner.agent
      .patch(templateUrl)
      .send({ tasks: [{ title: "Only one", priority: "urgent" }] });

    expect(replaced.body.template.taskCount).toBe(1);
    expect(replaced.body.template.tasks[0]).toMatchObject({
      title: "Only one",
      priority: "urgent",
      position: 1000,
    });

    const emptied = await owner.agent.patch(templateUrl).send({ tasks: [] });

    expect(emptied.body.template.taskCount).toBe(0);
    expect((await owner.agent.patch(templateUrl).send({})).status).toBe(400);
  });

  it("deletes a template for good", async () => {
    const { owner, url } = await setup();
    const created = await makeTemplate(owner.agent, url);
    const templateUrl = `${url}/${created.body.template.id}`;

    expect((await owner.agent.delete(templateUrl)).status).toBe(204);

    const gone = await owner.agent.get(templateUrl);

    expect(gone.status).toBe(404);
    expect(gone.body.error.code).toBe("TEMPLATE_NOT_FOUND");
    expect((await owner.agent.get(`${url}/not-a-uuid`)).status).toBe(404);
    expect((await owner.agent.delete(templateUrl)).status).toBe(404);
  });

  it("lets team members read templates but not change them", async () => {
    const { owner, workspaceId, base, url } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const created = await makeTemplate(owner.agent, url);
    const templateUrl = `${url}/${created.body.template.id}`;
    const project = await owner.agent.post(`${base}/clients`).send({ companyName: "Harbor & Co" });
    const made = await owner.agent
      .post(`${base}/projects`)
      .send({ clientId: project.body.client.id, name: "Packaging" });

    expect((await member.agent.get(url)).status).toBe(200);
    expect((await member.agent.get(templateUrl)).status).toBe(200);
    expect((await member.agent.post(url).send({ name: "Mine" })).status).toBe(403);
    expect((await member.agent.patch(templateUrl).send({ name: "Mine" })).status).toBe(403);
    expect((await member.agent.delete(templateUrl)).status).toBe(403);
    expect(
      (
        await member.agent
          .post(`${base}/projects/${made.body.project.id}/save-as-template`)
          .send({ name: "Mine" })
      ).status,
    ).toBe(403);
  });
});

describe("saving a project as a template", () => {
  it("copies the tasks in board order and turns due dates into day offsets", async () => {
    const ctx = await setup();
    const project = await makeProject(ctx, { startDate: "2026-03-01" });
    const projectId = project.body.project.id;
    const add = (body) => {
      return ctx.owner.agent.post(`${ctx.base}/projects/${projectId}/tasks`).send(body);
    };

    await add({ title: "A", dueDate: "2026-03-01", priority: "high", description: "First" });
    await add({ title: "B", dueDate: "2026-03-11" });
    await add({ title: "C" });
    // Done, and due before the project starts: no sensible offset.
    await add({ title: "D", status: "done", dueDate: "2026-02-01" });

    const res = await ctx.owner.agent
      .post(`${ctx.base}/projects/${projectId}/save-as-template`)
      .send({ name: "From project" });

    expect(res.status).toBe(201);

    const { tasks } = res.body.template;

    expect(pick(tasks, "title")).toEqual(["A", "B", "C", "D"]);
    expect(pick(tasks, "dueOffsetDays")).toEqual([0, 10, null, null]);
    expect(tasks[0]).toMatchObject({ priority: "high", description: "First" });
    // A template holds starter tasks: no column, assignee or date comes along.
    expect(tasks[0]).not.toHaveProperty("status");
    expect(tasks[0]).not.toHaveProperty("assigneeId");
    expect(tasks[0]).not.toHaveProperty("dueDate");
  });

  it("keeps no offsets without a start date, and refuses a taken name or missing project", async () => {
    const ctx = await setup();
    const project = await makeProject(ctx);
    const projectId = project.body.project.id;

    await ctx.owner.agent
      .post(`${ctx.base}/projects/${projectId}/tasks`)
      .send({ title: "A", dueDate: "2026-03-05" });

    const saveUrl = `${ctx.base}/projects/${projectId}/save-as-template`;
    const res = await ctx.owner.agent.post(saveUrl).send({ name: "No dates" });

    expect(res.status).toBe(201);
    expect(pick(res.body.template.tasks, "dueOffsetDays")).toEqual([null]);

    const again = await ctx.owner.agent.post(saveUrl).send({ name: "no dates" });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("TEMPLATE_EXISTS");

    const missing = await ctx.owner.agent
      .post(`${ctx.base}/projects/${MISSING_ID}/save-as-template`)
      .send({ name: "Whatever" });

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("refuses a project with more than 100 tasks", async () => {
    const ctx = await setup();
    const project = await makeProject(ctx);
    const projectId = project.body.project.id;
    const rows = Array.from({ length: 101 }, (unused, index) => {
      return {
        workspace_id: ctx.workspaceId,
        project_id: projectId,
        title: `Task ${index}`,
        position: (index + 1) * 1000,
      };
    });

    await db("tasks").insert(rows);

    const res = await ctx.owner.agent
      .post(`${ctx.base}/projects/${projectId}/save-as-template`)
      .send({ name: "Too big" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOO_MANY_TASKS");
  });
});

describe("starting a project from a template", () => {
  it("adds the tasks, dates them from the start date and records it", async () => {
    const ctx = await setup();
    const template = await makeTemplate(ctx.owner.agent, ctx.url);
    const res = await makeProject(ctx, {
      startDate: "2026-05-01",
      templateId: template.body.template.id,
    });

    expect(res.status).toBe(201);
    // Nothing typed for the description, so the template's is used.
    expect(res.body.project).toMatchObject({
      taskCount: 3,
      tasksDone: 0,
      description: "Standard launch checklist",
    });

    const tasks = await tasksOf(ctx, res.body.project.id);

    expect(pick(tasks, "title")).toEqual(["Kickoff call", "Design review", "Launch"]);
    expect(pick(tasks, "dueDate")).toEqual(["2026-05-01", "2026-05-08", null]);
    expect(pick(tasks, "priority")).toEqual(["high", "medium", "medium"]);
    expect(pick(tasks, "status")).toEqual(["todo", "todo", "todo"]);
    expect(pick(tasks, "position")).toEqual([1000, 2000, 3000]);
    expect(pick(tasks, "assigneeId")).toEqual([null, null, null]);

    const feed = await ctx.owner.agent.get(`${ctx.base}/projects/${res.body.project.id}/activity`);

    expect(feed.body.activity[0]).toMatchObject({
      action: "project.created",
      metadata: { templateName: "Website launch", tasksAdded: 3 },
    });

    const typed = await makeProject(ctx, {
      name: "Second",
      description: "Custom",
      templateId: template.body.template.id,
    });

    expect(typed.body.project.description).toBe("Custom");
  });

  it("dates tasks from today when the project has no start date, and copes with an empty template", async () => {
    const ctx = await setup();
    const template = await makeTemplate(ctx.owner.agent, ctx.url);
    const res = await makeProject(ctx, { templateId: template.body.template.id });
    const tasks = await tasksOf(ctx, res.body.project.id);
    const today = new Date().toISOString().slice(0, 10);
    const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    expect(pick(tasks, "dueDate")).toEqual([today, inAWeek, null]);

    const empty = await makeTemplate(ctx.owner.agent, ctx.url, { name: "Empty", tasks: [] });
    const plain = await makeProject(ctx, { name: "Plain", templateId: empty.body.template.id });

    expect(plain.status).toBe(201);
    expect(plain.body.project.taskCount).toBe(0);
  });

  it("creates nothing when the template can't be used", async () => {
    const ctx = await setup();
    const other = await createWorkspace("Elsewhere");
    const foreign = await makeTemplate(other.owner.agent, `${WS}/${other.workspaceId}/templates`);

    for (const templateId of [MISSING_ID, foreign.body.template.id]) {
      const res = await makeProject(ctx, { templateId });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TEMPLATE_NOT_FOUND");
    }

    expect((await makeProject(ctx, { templateId: "nope" })).status).toBe(400);

    const list = await ctx.owner.agent.get(`${ctx.base}/projects`);

    expect(list.body.meta.total).toBe(0);
  });

  it("leaves a project's tasks alone when its template is deleted later", async () => {
    const ctx = await setup();
    const template = await makeTemplate(ctx.owner.agent, ctx.url);
    const res = await makeProject(ctx, { templateId: template.body.template.id });

    await ctx.owner.agent.delete(`${ctx.url}/${template.body.template.id}`);

    expect(await tasksOf(ctx, res.body.project.id)).toHaveLength(3);
  });
});
