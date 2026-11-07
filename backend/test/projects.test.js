import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WORKSPACES = "/api/v1/workspaces";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const clientsUrl = (workspaceId) => {
  return `${WORKSPACES}/${workspaceId}/clients`;
};

const projectsUrl = (workspaceId) => {
  return `${WORKSPACES}/${workspaceId}/projects`;
};

const idOf = (user) => {
  return user.res.body.user.id;
};

const makeClient = async (agent, workspaceId, companyName = "Northwind Studio") => {
  const res = await agent.post(clientsUrl(workspaceId)).send({ companyName });

  return res.body.client.id;
};

// A workspace with an owner and one client, ready for projects.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace();
  const clientId = await makeClient(owner.agent, workspaceId);

  return { owner, workspaceId, clientId, url: projectsUrl(workspaceId) };
};

const createProject = async (agent, url, clientId, body = {}) => {
  return agent.post(url).send({ clientId, name: "Website redesign", ...body });
};

const namesOf = (res) => {
  return res.body.projects.map((project) => {
    return project.name;
  });
};

const feedOf = async (agent, workspaceId, clientId) => {
  const res = await agent.get(`${clientsUrl(workspaceId)}/${clientId}/activity`);

  return res.body.activity;
};

describe("creating projects", () => {
  it("saves clean values, fills in the defaults and records the event", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const res = await createProject(owner.agent, url, clientId, {
      description: "  Rebuild the site  ",
      status: "active",
      startDate: "2026-11-10",
      dueDate: "2026-12-20",
      budgetMinor: 1250000,
      currency: "gbp",
    });

    expect(res.status).toBe(201);
    expect(res.body.project).toMatchObject({
      clientId,
      clientName: "Northwind Studio",
      name: "Website redesign",
      description: "Rebuild the site",
      status: "active",
      startDate: "2026-11-10",
      dueDate: "2026-12-20",
      budgetMinor: 1250000,
      currency: "GBP",
      archivedAt: null,
      memberCount: 0,
      members: [],
    });

    const feed = await feedOf(owner.agent, workspaceId, clientId);

    expect(feed[0]).toMatchObject({
      action: "project.created",
      entityType: "project",
      clientId,
      metadata: { name: "Website redesign", clientName: "Northwind Studio" },
    });

    const bare = await createProject(owner.agent, url, clientId, {
      name: "Bare",
      description: "",
      startDate: "",
    });

    expect(bare.body.project).toMatchObject({
      status: "planned",
      description: null,
      startDate: null,
      dueDate: null,
      budgetMinor: null,
      currency: null,
    });
  });

  it("rejects bad input with a message for the right field", async () => {
    const { owner, clientId, url } = await setup();
    const cases = [
      [{ startDate: "2026-11-10", dueDate: "2026-11-01" }, "dueDate"],
      [{ startDate: "2026-02-30" }, "startDate"],
      [{ dueDate: "soon" }, "dueDate"],
      [{ budgetMinor: -5 }, "budgetMinor"],
      [{ budgetMinor: 10.5 }, "budgetMinor"],
      [{ status: "banana" }, "status"],
      [{ currency: "dollars" }, "currency"],
      [{ name: "" }, "name"],
    ];

    for (const [body, field] of cases) {
      const res = await createProject(owner.agent, url, clientId, body);

      expect(res.status).toBe(400);
      expect(res.body.error.details.fields[field]).toBeDefined();
    }

    const noClient = await owner.agent.post(url).send({ name: "No client" });
    const unknown = await createProject(owner.agent, url, clientId, { ownerId: MISSING_ID });

    expect(noClient.status).toBe(400);
    expect(noClient.body.error.details.fields.clientId).toBeDefined();
    expect(unknown.status).toBe(400);
  });

  it("needs a real client in this workspace", async () => {
    const { owner, url } = await setup();
    const elsewhere = await createWorkspace("Elsewhere");
    const foreignClient = await makeClient(elsewhere.owner.agent, elsewhere.workspaceId);

    const missing = await createProject(owner.agent, url, MISSING_ID);
    const malformed = await createProject(owner.agent, url, "not-a-uuid");
    const foreign = await createProject(owner.agent, url, foreignClient);

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("CLIENT_NOT_FOUND");
    expect(malformed.status).toBe(400);
    expect(foreign.status).toBe(404);
  });

  it("won't add a project to an archived client", async () => {
    const { owner, workspaceId, clientId, url } = await setup();

    await owner.agent.post(`${clientsUrl(workspaceId)}/${clientId}/archive`);

    const res = await createProject(owner.agent, url, clientId);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CLIENT_ARCHIVED");
  });
});

describe("reading and editing projects", () => {
  it("reads one back, and answers 404 for unknown and malformed ids", async () => {
    const { owner, clientId, url } = await setup();
    const created = await createProject(owner.agent, url, clientId);
    const res = await owner.agent.get(`${url}/${created.body.project.id}`);

    expect(res.status).toBe(200);
    expect(res.body.project).toMatchObject({ name: "Website redesign", members: [] });

    for (const id of [MISSING_ID, "not-a-uuid"]) {
      const missing = await owner.agent.get(`${url}/${id}`);

      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("changes only what was sent, turns blanks into nothing, and keeps the client fixed", async () => {
    const { owner, clientId, url } = await setup();
    const created = await createProject(owner.agent, url, clientId, {
      description: "Old",
      budgetMinor: 5000,
      currency: "USD",
    });
    const projectUrl = `${url}/${created.body.project.id}`;
    const res = await owner.agent
      .patch(projectUrl)
      .send({ status: "completed", description: "", budgetMinor: null });

    expect(res.status).toBe(200);
    expect(res.body.project).toMatchObject({
      name: "Website redesign",
      status: "completed",
      description: null,
      budgetMinor: null,
      currency: "USD",
    });
    expect((await owner.agent.patch(projectUrl).send({})).status).toBe(400);
    expect((await owner.agent.patch(projectUrl).send({ clientId: MISSING_ID })).status).toBe(400);
  });

  it("checks dates against the saved ones when only one date is edited", async () => {
    const { owner, clientId, url } = await setup();
    const created = await createProject(owner.agent, url, clientId, {
      startDate: "2026-11-10",
      dueDate: "2026-12-20",
    });
    const projectUrl = `${url}/${created.body.project.id}`;
    const dueTooEarly = await owner.agent.patch(projectUrl).send({ dueDate: "2026-11-05" });
    const startTooLate = await owner.agent.patch(projectUrl).send({ startDate: "2026-12-31" });
    const fine = await owner.agent.patch(projectUrl).send({ dueDate: "2027-01-15" });

    expect(dueTooEarly.status).toBe(400);
    expect(dueTooEarly.body.error.details.fields.dueDate).toBeDefined();
    expect(startTooLate.status).toBe(400);
    expect(fine.status).toBe(200);
    expect(fine.body.project.dueDate).toBe("2027-01-15");
  });

  it("records which fields changed, never their text, and ignores edits that change nothing", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const created = await createProject(owner.agent, url, clientId, {
      description: "Secret scope text",
    });
    const projectUrl = `${url}/${created.body.project.id}`;

    await owner.agent
      .patch(projectUrl)
      .send({ name: "Website relaunch", status: "completed", description: "More secret text" });

    const feed = await feedOf(owner.agent, workspaceId, clientId);
    const event = feed[0];

    expect(event.action).toBe("project.updated");
    expect(event.metadata.fields.sort()).toEqual(["description", "name", "status"]);
    expect(event.metadata.status).toEqual({ from: "planned", to: "completed" });
    expect(event.metadata.previousName).toBe("Website redesign");
    expect(event.metadata.name).toBe("Website relaunch");
    expect(JSON.stringify(event.metadata).toLowerCase()).not.toContain("secret");

    const noChange = await owner.agent
      .patch(projectUrl)
      .send({ name: "Website relaunch", status: "completed" });
    const after = await feedOf(owner.agent, workspaceId, clientId);

    expect(noChange.status).toBe(200);
    expect(
      after.map((item) => {
        return item.action;
      }),
    ).toEqual(["project.updated", "project.created", "client.created"]);
  });
});

describe("archiving projects", () => {
  it("hides an archived project, brings it back on restore, and ignores repeats", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const created = await createProject(owner.agent, url, clientId);
    const projectUrl = `${url}/${created.body.project.id}`;

    const archived = await owner.agent.post(`${projectUrl}/archive`);

    await owner.agent.post(`${projectUrl}/archive`);

    expect(archived.status).toBe(200);
    expect(archived.body.project.archivedAt).not.toBeNull();
    expect(namesOf(await owner.agent.get(url))).toEqual([]);
    expect(namesOf(await owner.agent.get(`${url}?view=archived`))).toEqual(["Website redesign"]);
    expect(namesOf(await owner.agent.get(`${url}?view=all`))).toEqual(["Website redesign"]);

    const restored = await owner.agent.post(`${projectUrl}/restore`);

    expect(restored.body.project.archivedAt).toBeNull();
    expect(namesOf(await owner.agent.get(url))).toEqual(["Website redesign"]);

    const feed = await feedOf(owner.agent, workspaceId, clientId);

    expect(
      feed.slice(0, 3).map((item) => {
        return item.action;
      }),
    ).toEqual(["project.restored", "project.archived", "project.created"]);
  });
});

describe("listing projects", () => {
  it("searches project names and client names, and treats % as plain text", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const brightId = await makeClient(owner.agent, workspaceId, "Bright Labs");

    await createProject(owner.agent, url, clientId, { name: "Site" });
    await createProject(owner.agent, url, brightId, { name: "Brochure" });
    await createProject(owner.agent, url, clientId, { name: "100% Pure" });

    expect(namesOf(await owner.agent.get(`${url}?search=site`))).toEqual(["Site"]);
    expect(namesOf(await owner.agent.get(`${url}?search=bright`))).toEqual(["Brochure"]);
    expect(namesOf(await owner.agent.get(`${url}?search=%25`))).toEqual(["100% Pure"]);
    expect(namesOf(await owner.agent.get(`${url}?search=_`))).toEqual([]);
  });

  it("filters by client and status, and combines filters", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const otherId = await makeClient(owner.agent, workspaceId, "Other Co");

    await createProject(owner.agent, url, clientId, { name: "A", status: "active" });
    await createProject(owner.agent, url, clientId, { name: "B", status: "planned" });
    await createProject(owner.agent, url, otherId, { name: "C", status: "active" });

    expect(namesOf(await owner.agent.get(`${url}?clientId=${clientId}`))).toEqual(["A", "B"]);
    expect(namesOf(await owner.agent.get(`${url}?status=active`))).toEqual(["A", "C"]);
    expect(namesOf(await owner.agent.get(`${url}?clientId=${clientId}&status=active`))).toEqual([
      "A",
    ]);
  });

  it("sorts, puts projects without a due date last either way, and pages cleanly", async () => {
    const { owner, clientId, url } = await setup();

    await createProject(owner.agent, url, clientId, { name: "A", dueDate: "2026-12-01" });
    await createProject(owner.agent, url, clientId, { name: "B", dueDate: "2026-11-01" });
    await createProject(owner.agent, url, clientId, { name: "C" });

    expect(namesOf(await owner.agent.get(`${url}?sort=due&order=asc`))).toEqual(["B", "A", "C"]);
    expect(namesOf(await owner.agent.get(`${url}?sort=due&order=desc`))).toEqual(["A", "B", "C"]);
    expect(namesOf(await owner.agent.get(`${url}?sort=name&order=desc`))).toEqual(["C", "B", "A"]);

    const first = await owner.agent.get(`${url}?pageSize=2&page=1`);
    const second = await owner.agent.get(`${url}?pageSize=2&page=2`);

    expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(namesOf(first)).toEqual(["A", "B"]);
    expect(namesOf(second)).toEqual(["C"]);
  });

  it("rejects values it doesn't understand", async () => {
    const { owner, url } = await setup();
    const queries = [
      "pageSize=500",
      "page=0",
      "status=banana",
      "sort=budget",
      "view=x",
      "clientId=nope",
    ];

    for (const query of queries) {
      expect((await owner.agent.get(`${url}?${query}`)).status).toBe(400);
    }
  });

  it("shows how many people are on each project", async () => {
    const { owner, clientId, url } = await setup();
    const created = await createProject(owner.agent, url, clientId);

    await owner.agent
      .post(`${url}/${created.body.project.id}/members`)
      .send({ userId: idOf(owner) });

    const list = await owner.agent.get(url);

    expect(list.body.projects[0].memberCount).toBe(1);
  });
});

describe("project teams", () => {
  it("assigns people, defaulting to the member role, and records it", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const lead = await addMemberTo(workspaceId, "member");
    const helper = await addMemberTo(workspaceId, "admin");
    const created = await createProject(owner.agent, url, clientId);
    const membersUrl = `${url}/${created.body.project.id}/members`;

    const first = await owner.agent.post(membersUrl).send({ userId: idOf(lead), role: "lead" });

    await owner.agent.post(membersUrl).send({ userId: idOf(helper) });

    expect(first.status).toBe(201);
    expect(first.body.project.memberCount).toBe(1);

    const project = await owner.agent.get(`${url}/${created.body.project.id}`);

    expect(project.body.project.memberCount).toBe(2);
    expect(project.body.project.members).toHaveLength(2);
    expect(project.body.project.members[0]).toMatchObject({
      userId: idOf(lead),
      name: "Test User",
      role: "lead",
    });
    expect(project.body.project.members[1].role).toBe("member");

    const feed = await feedOf(owner.agent, workspaceId, clientId);

    expect(feed[0]).toMatchObject({
      action: "project.member_added",
      metadata: { name: "Website redesign", memberName: "Test User" },
    });
  });

  it("refuses to assign the same person twice", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const created = await createProject(owner.agent, url, clientId);
    const membersUrl = `${url}/${created.body.project.id}/members`;

    await owner.agent.post(membersUrl).send({ userId: idOf(member) });

    const again = await owner.agent.post(membersUrl).send({ userId: idOf(member) });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ALREADY_ASSIGNED");
  });

  it("only assigns active people who work in this workspace", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const portalClient = await addMemberTo(workspaceId, "client");
    const suspended = await addMemberTo(workspaceId, "member", "suspended");
    const outsider = await createWorkspace("Elsewhere");
    const created = await createProject(owner.agent, url, clientId);
    const membersUrl = `${url}/${created.body.project.id}/members`;

    const asClient = await owner.agent.post(membersUrl).send({ userId: idOf(portalClient) });
    const asSuspended = await owner.agent.post(membersUrl).send({ userId: idOf(suspended) });
    const asOutsider = await owner.agent.post(membersUrl).send({ userId: idOf(outsider.owner) });
    const malformed = await owner.agent.post(membersUrl).send({ userId: "not-a-uuid" });

    expect(asClient.status).toBe(400);
    expect(asClient.body.error.code).toBe("INVALID_MEMBER");
    expect(asSuspended.status).toBe(404);
    expect(asOutsider.status).toBe(404);
    expect(asOutsider.body.error.code).toBe("MEMBER_NOT_FOUND");
    expect(malformed.status).toBe(400);
  });

  it("unassigns people and records it", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const created = await createProject(owner.agent, url, clientId);
    const projectUrl = `${url}/${created.body.project.id}`;

    await owner.agent.post(`${projectUrl}/members`).send({ userId: idOf(member) });

    const res = await owner.agent.delete(`${projectUrl}/members/${idOf(member)}`);
    const again = await owner.agent.delete(`${projectUrl}/members/${idOf(member)}`);
    const malformed = await owner.agent.delete(`${projectUrl}/members/not-a-uuid`);

    expect(res.status).toBe(200);
    expect(res.body.project.memberCount).toBe(0);
    expect(again.status).toBe(404);
    expect(malformed.status).toBe(404);

    const feed = await feedOf(owner.agent, workspaceId, clientId);

    expect(feed[0].action).toBe("project.member_removed");
  });

  it("drops someone from their projects when they are removed from the workspace", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const created = await createProject(owner.agent, url, clientId);
    const projectUrl = `${url}/${created.body.project.id}`;

    await owner.agent.post(`${projectUrl}/members`).send({ userId: idOf(member) });

    const removed = await owner.agent.delete(
      `${WORKSPACES}/${workspaceId}/members/${idOf(member)}`,
    );
    const project = await owner.agent.get(projectUrl);

    expect(removed.status).toBe(204);
    expect(project.body.project.members).toEqual([]);
    expect(project.body.project.memberCount).toBe(0);
  });
});

// Every role is tried against every action. The owner makes a client and a project first,
// so there's always something to archive.
const RULES = [
  {
    action: "list projects",
    allowed: ["owner", "admin", "member"],
    successStatus: 200,
    call: (agent, url) => {
      return agent.get(url);
    },
  },
  {
    action: "create a project",
    allowed: ["owner", "admin", "member"],
    successStatus: 201,
    call: (agent, url, { clientId }) => {
      return agent.post(url).send({ clientId, name: "Made By Role" });
    },
  },
  {
    action: "archive a project",
    allowed: ["owner", "admin"],
    successStatus: 200,
    call: (agent, url, { projectId }) => {
      return agent.post(`${url}/${projectId}/archive`);
    },
  },
];

describe("who can do what with projects", () => {
  for (const rule of RULES) {
    for (const role of ["owner", "admin", "member", "client"]) {
      const allowed = rule.allowed.includes(role);

      it(`${role} ${allowed ? "can" : "cannot"} ${rule.action}`, async () => {
        const { owner, workspaceId, clientId, url } = await setup();
        const user = role === "owner" ? owner : await addMemberTo(workspaceId, role);
        const existing = await createProject(owner.agent, url, clientId);
        const res = await rule.call(user.agent, url, {
          clientId,
          projectId: existing.body.project.id,
        });

        expect(res.status).toBe(allowed ? rule.successStatus : 403);
        expect(res.body.error?.code).toBe(allowed ? undefined : "FORBIDDEN");
      });
    }
  }
});

describe("keeping workspaces apart", () => {
  it("never lets one workspace reach another's projects", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await setup();
    const project = await createProject(beta.owner.agent, beta.url, beta.clientId);
    const projectId = project.body.project.id;
    const viaAlpha = projectsUrl(alpha.workspaceId);

    const read = await alpha.owner.agent.get(`${viaAlpha}/${projectId}`);

    expect(read.status).toBe(404);
    expect(read.body.error.code).toBe("PROJECT_NOT_FOUND");
    expect(
      (await alpha.owner.agent.patch(`${viaAlpha}/${projectId}`).send({ status: "active" })).status,
    ).toBe(404);
    expect((await alpha.owner.agent.post(`${viaAlpha}/${projectId}/archive`)).status).toBe(404);
    expect(
      (
        await alpha.owner.agent
          .post(`${viaAlpha}/${projectId}/members`)
          .send({ userId: idOf(alpha.owner) })
      ).status,
    ).toBe(404);

    const list = await alpha.owner.agent.get(viaAlpha);

    expect(list.body.projects).toEqual([]);
    expect(list.body.meta.total).toBe(0);

    // Using the other workspace's client, or its own address, is refused too.
    expect((await createProject(alpha.owner.agent, viaAlpha, beta.clientId)).status).toBe(404);
    expect((await alpha.owner.agent.get(beta.url)).status).toBe(404);

    const check = await beta.owner.agent.get(`${beta.url}/${projectId}`);

    expect(check.body.project).toMatchObject({ name: "Website redesign", archivedAt: null });
  });

  it("makes the database refuse cross-workspace links", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await setup();
    const project = await createProject(beta.owner.agent, beta.url, beta.clientId);

    // A project in one workspace pointing at another workspace's client.
    await expect(
      db("projects").insert({
        workspace_id: alpha.workspaceId,
        client_id: beta.clientId,
        name: "Mismatch",
      }),
    ).rejects.toThrow();

    // A person assigned to a project in a workspace they don't belong to.
    await expect(
      db("project_members").insert({
        project_id: project.body.project.id,
        workspace_id: beta.workspaceId,
        user_id: idOf(alpha.owner),
      }),
    ).rejects.toThrow();
  });
});

const actionsOf = (res) => {
  return res.body.activity.map((event) => {
    return event.action;
  });
};

describe("a project's own activity", () => {
  it("lists only that project's events, newest first", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const first = await createProject(owner.agent, url, clientId);
    const second = await createProject(owner.agent, url, clientId, { name: "Brand refresh" });
    const projectUrl = `${url}/${first.body.project.id}`;

    await owner.agent.patch(projectUrl).send({ status: "active" });
    await owner.agent.post(`${projectUrl}/members`).send({ userId: idOf(member) });
    // Neither of these belongs to the first project.
    await owner.agent.patch(`${clientsUrl(workspaceId)}/${clientId}`).send({ status: "active" });
    await owner.agent.patch(`${url}/${second.body.project.id}`).send({ status: "active" });

    const feed = await owner.agent.get(`${projectUrl}/activity`);

    expect(feed.status).toBe(200);
    expect(actionsOf(feed)).toEqual(["project.member_added", "project.updated", "project.created"]);
    expect(
      feed.body.activity.every((event) => {
        return event.entityId === first.body.project.id;
      }),
    ).toBe(true);
    expect(feed.body.meta).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
  });

  it("pages through the feed", async () => {
    const { owner, clientId, url } = await setup();
    const created = await createProject(owner.agent, url, clientId);
    const projectUrl = `${url}/${created.body.project.id}`;

    await owner.agent.patch(projectUrl).send({ status: "active" });
    await owner.agent.patch(projectUrl).send({ status: "on_hold" });

    const page1 = await owner.agent.get(`${projectUrl}/activity?pageSize=2`);
    const page2 = await owner.agent.get(`${projectUrl}/activity?pageSize=2&page=2`);

    expect(page1.body.activity).toHaveLength(2);
    expect(page1.body.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(actionsOf(page2)).toEqual(["project.created"]);
  });

  it("answers 404 for a missing, malformed or other workspace's project", async () => {
    const { owner, url } = await setup();
    const other = await createWorkspace("Elsewhere");
    const otherClient = await makeClient(other.owner.agent, other.workspaceId);
    const otherProject = await createProject(
      other.owner.agent,
      projectsUrl(other.workspaceId),
      otherClient,
    );

    for (const id of [MISSING_ID, "not-a-uuid", otherProject.body.project.id]) {
      const res = await owner.agent.get(`${url}/${id}/activity`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("is open to team members and closed to client users", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const portalClient = await addMemberTo(workspaceId, "client");
    const created = await createProject(owner.agent, url, clientId);
    const feedUrl = `${url}/${created.body.project.id}/activity`;

    expect((await member.agent.get(feedUrl)).status).toBe(200);
    expect((await portalClient.agent.get(feedUrl)).status).toBe(403);
  });
});
