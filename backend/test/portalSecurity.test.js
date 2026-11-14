import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

// A client company and a project, and a client user who has been given access to them.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Security Studio");
  const clientRes = await owner.agent
    .post(`${base(workspaceId)}/clients`)
    .send({ companyName: "Alpha Co" });
  const clientId = clientRes.body.client.id;
  const projectRes = await owner.agent
    .post(`${base(workspaceId)}/projects`)
    .send({ clientId, name: "Alpha site" });
  const projectId = projectRes.body.project.id;
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/access`)
    .send({ userId: person.res.body.user.id });

  return { owner, workspaceId, clientId, projectId, person };
};

describe("portal security", () => {
  it("keeps a client user out of every team route they could read", async () => {
    const { workspaceId, clientId, projectId, person } = await setup();
    const paths = [
      "/members",
      "/invitations",
      "/clients",
      `/clients/${clientId}`,
      `/clients/${clientId}/messages`,
      `/clients/${clientId}/access`,
      `/clients/${clientId}/access/candidates`,
      "/activity",
      "/my-tasks",
      "/projects",
      `/projects/${projectId}`,
      `/projects/${projectId}/tasks`,
      `/projects/${projectId}/activity`,
      "/templates",
    ];

    for (const path of paths) {
      const res = await person.agent.get(`${base(workspaceId)}${path}`);

      expect(res.status, `GET ${path}`).toBe(403);
    }
  });

  it("keeps a client user from creating anything through the team routes", async () => {
    const { workspaceId, clientId, projectId, person } = await setup();
    const attempts = [
      ["/clients", { companyName: "Sneaky Co" }],
      ["/projects", { clientId, name: "Sneaky project" }],
      ["/templates", { name: "Sneaky template" }],
      [`/clients/${clientId}/messages`, { body: "Sneaky note", internal: true }],
      [`/projects/${projectId}/tasks`, { title: "Sneaky task" }],
    ];

    for (const [path, body] of attempts) {
      const res = await person.agent.post(`${base(workspaceId)}${path}`).send(body);

      expect(res.status, `POST ${path}`).toBe(403);
    }
  });

  it("locks out a client user who has been suspended", async () => {
    const { workspaceId, person } = await setup();

    await db("memberships")
      .where({ workspace_id: workspaceId, user_id: person.res.body.user.id })
      .update({ status: "suspended" });

    const projects = await person.agent.get(`${base(workspaceId)}/portal/projects`);
    const notifications = await person.agent.get(`${base(workspaceId)}/notifications`);

    expect(projects.status).toBe(404);
    expect(notifications.status).toBe(404);
  });
});
