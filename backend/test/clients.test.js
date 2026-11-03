import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WORKSPACES = "/api/v1/workspaces";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const clientsUrl = (workspaceId) => {
  return `${WORKSPACES}/${workspaceId}/clients`;
};

// Creates a client through the API and returns the full response.
const createClient = async (agent, workspaceId, body = {}) => {
  return agent.post(clientsUrl(workspaceId)).send({ companyName: "Northwind Studio", ...body });
};

const namesOf = (res) => {
  return res.body.clients.map((client) => {
    return client.companyName;
  });
};

describe("creating clients", () => {
  it("saves clean values and fills in the defaults", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const res = await createClient(owner.agent, workspaceId, {
      companyName: "  Northwind Studio  ",
      billingEmail: "Accounts@Northwind.test",
      currency: "gbp",
      taxId: "",
      tags: ["Design", "Retainer", " design "],
    });

    expect(res.status).toBe(201);
    expect(res.body.client).toMatchObject({
      companyName: "Northwind Studio",
      status: "lead",
      billingEmail: "accounts@northwind.test",
      currency: "GBP",
      taxId: null,
      tags: ["design", "retainer"],
      archivedAt: null,
    });
  });

  it("refuses a second active client with the same name, ignoring capitals", async () => {
    const { owner, workspaceId } = await createWorkspace();

    await createClient(owner.agent, workspaceId);

    const res = await createClient(owner.agent, workspaceId, { companyName: "NORTHWIND studio" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CLIENT_EXISTS");
  });

  it("lets two workspaces have a client with the same name", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await createWorkspace("Beta");

    expect((await createClient(alpha.owner.agent, alpha.workspaceId)).status).toBe(201);
    expect((await createClient(beta.owner.agent, beta.workspaceId)).status).toBe(201);
  });

  it("lets a name be used again once the old client is archived", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const first = await createClient(owner.agent, workspaceId);

    await owner.agent.post(`${clientsUrl(workspaceId)}/${first.body.client.id}/archive`);

    expect((await createClient(owner.agent, workspaceId)).status).toBe(201);
  });

  it("rejects bad input with a message for each field", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = clientsUrl(workspaceId);

    const empty = await owner.agent.post(url).send({});
    const badStatus = await createClient(owner.agent, workspaceId, { status: "banana" });
    const badCurrency = await createClient(owner.agent, workspaceId, { currency: "dollars" });
    const badEmail = await createClient(owner.agent, workspaceId, { billingEmail: "not-an-email" });
    const unknown = await createClient(owner.agent, workspaceId, { ownerId: MISSING_ID });

    expect(empty.status).toBe(400);
    expect(empty.body.error.details.fields.companyName).toBeDefined();
    expect(badStatus.body.error.details.fields.status).toBeDefined();
    expect(badCurrency.body.error.details.fields.currency).toBeDefined();
    expect(badEmail.body.error.details.fields.billingEmail).toBeDefined();
    expect(unknown.status).toBe(400);
  });
});

describe("reading and editing clients", () => {
  it("reads one client back", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const created = await createClient(owner.agent, workspaceId);
    const res = await owner.agent.get(`${clientsUrl(workspaceId)}/${created.body.client.id}`);

    expect(res.status).toBe(200);
    expect(res.body.client.companyName).toBe("Northwind Studio");
  });

  it("changes only the fields that were sent, and turns blanks into nothing", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const created = await createClient(owner.agent, workspaceId, { taxId: "TX-1" });
    const url = `${clientsUrl(workspaceId)}/${created.body.client.id}`;
    const res = await owner.agent
      .patch(url)
      .send({ status: "past", taxId: "", notesInternal: "Paid late" });

    expect(res.status).toBe(200);
    expect(res.body.client).toMatchObject({
      companyName: "Northwind Studio",
      status: "past",
      taxId: null,
      notesInternal: "Paid late",
    });
    expect((await owner.agent.patch(url).send({})).status).toBe(400);
  });

  it("refuses to rename a client to a name another active client has", async () => {
    const { owner, workspaceId } = await createWorkspace();

    await createClient(owner.agent, workspaceId, { companyName: "Acme" });

    const other = await createClient(owner.agent, workspaceId, { companyName: "Globex" });
    const res = await owner.agent
      .patch(`${clientsUrl(workspaceId)}/${other.body.client.id}`)
      .send({ companyName: "acme" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CLIENT_EXISTS");
  });

  it("answers 404 for unknown and malformed ids", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = clientsUrl(workspaceId);

    for (const id of [MISSING_ID, "not-a-uuid"]) {
      const read = await owner.agent.get(`${url}/${id}`);
      const edit = await owner.agent.patch(`${url}/${id}`).send({ status: "active" });
      const archive = await owner.agent.post(`${url}/${id}/archive`);

      expect(read.status).toBe(404);
      expect(read.body.error.code).toBe("CLIENT_NOT_FOUND");
      expect(edit.status).toBe(404);
      expect(archive.status).toBe(404);
    }
  });
});

describe("archiving clients", () => {
  it("hides an archived client from the normal list and brings it back on restore", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const created = await createClient(owner.agent, workspaceId);
    const url = clientsUrl(workspaceId);
    const id = created.body.client.id;

    const archived = await owner.agent.post(`${url}/${id}/archive`);

    expect(archived.status).toBe(200);
    expect(archived.body.client.archivedAt).not.toBeNull();
    expect(namesOf(await owner.agent.get(url))).toEqual([]);
    expect(namesOf(await owner.agent.get(`${url}?view=archived`))).toEqual(["Northwind Studio"]);
    expect(namesOf(await owner.agent.get(`${url}?view=all`))).toEqual(["Northwind Studio"]);

    const restored = await owner.agent.post(`${url}/${id}/restore`);

    expect(restored.status).toBe(200);
    expect(restored.body.client.archivedAt).toBeNull();
    expect(namesOf(await owner.agent.get(url))).toEqual(["Northwind Studio"]);
  });

  it("won't restore a client whose name has been taken in the meantime", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const old = await createClient(owner.agent, workspaceId, { companyName: "Acme" });
    const url = clientsUrl(workspaceId);

    await owner.agent.post(`${url}/${old.body.client.id}/archive`);
    await createClient(owner.agent, workspaceId, { companyName: "Acme" });

    const res = await owner.agent.post(`${url}/${old.body.client.id}/restore`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CLIENT_EXISTS");
  });
});

describe("listing clients", () => {
  it("searches names, billing emails and contact names, and treats % as plain text", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = clientsUrl(workspaceId);
    const bright = await createClient(owner.agent, workspaceId, { companyName: "Bright Labs" });

    await createClient(owner.agent, workspaceId, {
      companyName: "Northwind",
      billingEmail: "pay@northwind.test",
    });
    await createClient(owner.agent, workspaceId, { companyName: "100% Organic" });
    await db("contacts").insert({
      workspace_id: workspaceId,
      client_id: bright.body.client.id,
      name: "Priya Raman",
      email: "priya@brightlabs.test",
    });

    expect(namesOf(await owner.agent.get(`${url}?search=north`))).toEqual(["Northwind"]);
    expect(namesOf(await owner.agent.get(`${url}?search=pay@north`))).toEqual(["Northwind"]);
    expect(namesOf(await owner.agent.get(`${url}?search=priya`))).toEqual(["Bright Labs"]);
    expect(namesOf(await owner.agent.get(`${url}?search=BRIGHTLABS`))).toEqual(["Bright Labs"]);
    expect(namesOf(await owner.agent.get(`${url}?search=%25`))).toEqual(["100% Organic"]);
    expect(namesOf(await owner.agent.get(`${url}?search=_`))).toEqual([]);
  });

  it("filters by status and tag, and combines filters", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = clientsUrl(workspaceId);

    await createClient(owner.agent, workspaceId, {
      companyName: "A",
      status: "lead",
      tags: ["retainer"],
    });
    await createClient(owner.agent, workspaceId, {
      companyName: "B",
      status: "active",
      tags: ["retainer", "project"],
    });
    await createClient(owner.agent, workspaceId, {
      companyName: "C",
      status: "active",
      tags: ["project"],
    });

    expect(namesOf(await owner.agent.get(`${url}?status=active`))).toEqual(["B", "C"]);
    expect(namesOf(await owner.agent.get(`${url}?tag=Retainer`))).toEqual(["A", "B"]);
    expect(namesOf(await owner.agent.get(`${url}?status=active&tag=retainer`))).toEqual(["B"]);
  });

  it("sorts and pages without repeating or skipping anyone", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = clientsUrl(workspaceId);

    for (const number of [1, 2, 3, 4, 5]) {
      await createClient(owner.agent, workspaceId, { companyName: `Client ${number}` });
    }

    const first = await owner.agent.get(`${url}?pageSize=2&page=1`);
    const second = await owner.agent.get(`${url}?pageSize=2&page=2`);
    const third = await owner.agent.get(`${url}?pageSize=2&page=3`);

    expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
    expect(namesOf(first)).toEqual(["Client 1", "Client 2"]);
    expect(namesOf(second)).toEqual(["Client 3", "Client 4"]);
    expect(namesOf(third)).toEqual(["Client 5"]);

    const descending = await owner.agent.get(`${url}?sort=name&order=desc&pageSize=2`);

    expect(namesOf(descending)).toEqual(["Client 5", "Client 4"]);
  });

  it("rejects values it doesn't understand", async () => {
    const { owner, workspaceId } = await createWorkspace();
    const url = clientsUrl(workspaceId);

    for (const query of ["pageSize=500", "page=0", "status=banana", "sort=companyName", "view=x"]) {
      expect((await owner.agent.get(`${url}?${query}`)).status).toBe(400);
    }
  });

  it("counts tags for active clients only", async () => {
    const { owner, workspaceId } = await createWorkspace();

    await createClient(owner.agent, workspaceId, { companyName: "A", tags: ["x", "y"] });
    await createClient(owner.agent, workspaceId, { companyName: "B", tags: ["x"] });

    const hidden = await createClient(owner.agent, workspaceId, { companyName: "C", tags: ["z"] });

    await owner.agent.post(`${clientsUrl(workspaceId)}/${hidden.body.client.id}/archive`);

    const res = await owner.agent.get(`${clientsUrl(workspaceId)}/tags`);

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual([
      { name: "x", count: 2 },
      { name: "y", count: 1 },
    ]);
  });
});

// Every role is tried against every action. The owner makes a client first, so there's
// always something to archive.
const RULES = [
  {
    action: "list clients",
    allowed: ["owner", "admin", "member"],
    successStatus: 200,
    call: (agent, url) => {
      return agent.get(url);
    },
  },
  {
    action: "create a client",
    allowed: ["owner", "admin", "member"],
    successStatus: 201,
    call: (agent, url) => {
      return agent.post(url).send({ companyName: "Made By Role" });
    },
  },
  {
    action: "archive a client",
    allowed: ["owner", "admin"],
    successStatus: 200,
    call: (agent, url, clientId) => {
      return agent.post(`${url}/${clientId}/archive`);
    },
  },
];

describe("who can do what with clients", () => {
  for (const rule of RULES) {
    for (const role of ["owner", "admin", "member", "client"]) {
      const allowed = rule.allowed.includes(role);

      it(`${role} ${allowed ? "can" : "cannot"} ${rule.action}`, async () => {
        const { owner, workspaceId } = await createWorkspace();
        const user = role === "owner" ? owner : await addMemberTo(workspaceId, role);
        const existing = await createClient(owner.agent, workspaceId);
        const res = await rule.call(user.agent, clientsUrl(workspaceId), existing.body.client.id);

        expect(res.status).toBe(allowed ? rule.successStatus : 403);
        expect(res.body.error?.code).toBe(allowed ? undefined : "FORBIDDEN");
      });
    }
  }
});

describe("keeping workspaces apart", () => {
  it("hides one workspace's clients from another workspace's owner", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await createWorkspace("Beta");
    const secret = await createClient(beta.owner.agent, beta.workspaceId, {
      companyName: "Secret Co",
    });
    const secretId = secret.body.client.id;
    const url = clientsUrl(alpha.workspaceId);

    expect((await alpha.owner.agent.get(`${url}/${secretId}`)).status).toBe(404);
    expect(
      (await alpha.owner.agent.patch(`${url}/${secretId}`).send({ status: "past" })).status,
    ).toBe(404);
    expect((await alpha.owner.agent.post(`${url}/${secretId}/archive`)).status).toBe(404);

    const list = await alpha.owner.agent.get(url);

    expect(list.body.clients).toEqual([]);
    expect(list.body.meta.total).toBe(0);

    // Going through the other workspace's own address is refused too.
    expect((await alpha.owner.agent.get(clientsUrl(beta.workspaceId))).status).toBe(404);

    const check = await beta.owner.agent.get(`${clientsUrl(beta.workspaceId)}/${secretId}`);

    expect(check.body.client).toMatchObject({ companyName: "Secret Co", archivedAt: null });
  });

  it("makes the database refuse a contact that points at another workspace's client", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await createWorkspace("Beta");
    const client = await createClient(beta.owner.agent, beta.workspaceId);

    await expect(
      db("contacts").insert({
        workspace_id: alpha.workspaceId,
        client_id: client.body.client.id,
        name: "Mismatch",
      }),
    ).rejects.toThrow();
  });
});
