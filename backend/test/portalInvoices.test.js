import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const binary = (res, callback) => {
  const chunks = [];

  res.on("data", (chunk) => {
    chunks.push(chunk);
  });
  res.on("end", () => {
    callback(null, Buffer.concat(chunks));
  });
};

const makeClient = async (owner, workspaceId, companyName) => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

// Creates an invoice for a client. Optionally sends it, and then voids it.
const makeInvoice = async (owner, workspaceId, clientId, options = {}) => {
  const created = await owner.agent.post(`${base(workspaceId)}/invoices`).send({
    clientId,
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2099-12-16",
    taxRateBps: 1800,
    notes: "Thank you.",
    items: [{ description: "Design", quantity: "2", unitPriceMinor: 5000 }],
    ...options.overrides,
  });
  const id = created.body.invoice.id;
  const url = `${base(workspaceId)}/invoices/${id}`;

  if (options.send) {
    await owner.agent.post(`${url}/send`);
  }
  if (options.void) {
    await owner.agent.post(`${url}/void`);
  }

  return id;
};

// A client user with access to Alpha only. Alpha has a draft, a sent and a voided invoice,
// Beta has a sent one.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Portal Invoices");
  const clientA = await makeClient(owner, workspaceId, "Alpha Co");
  const clientB = await makeClient(owner, workspaceId, "Beta Co");
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientA}/access`)
    .send({ userId: person.res.body.user.id });

  const draft = await makeInvoice(owner, workspaceId, clientA);
  const sent = await makeInvoice(owner, workspaceId, clientA, { send: true });
  const voided = await makeInvoice(owner, workspaceId, clientA, { send: true, void: true });
  const other = await makeInvoice(owner, workspaceId, clientB, { send: true });

  return { owner, workspaceId, clientA, clientB, person, draft, sent, voided, other };
};

const portal = (workspaceId) => {
  return `${base(workspaceId)}/portal/invoices`;
};

describe("portal invoices", () => {
  it("lists only sent and void invoices of clients the person can access", async () => {
    const { workspaceId, person, sent, voided } = await setup();

    const res = await person.agent.get(portal(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(
      res.body.invoices
        .map((invoice) => {
          return invoice.id;
        })
        .sort(),
    ).toEqual([sent, voided].sort());
    expect(
      res.body.invoices.map((invoice) => {
        return invoice.status;
      }),
    ).not.toContain("draft");
  });

  it("shows nothing internal about an invoice", async () => {
    const { workspaceId, person, sent } = await setup();
    const listKeys = [
      "clientId",
      "clientName",
      "currency",
      "dueDate",
      "id",
      "issueDate",
      "label",
      "notes",
      "overdue",
      "projectName",
      "sentAt",
      "status",
      "subtotalMinor",
      "taxMinor",
      "taxRateBps",
      "totalMinor",
    ];

    const list = await person.agent.get(portal(workspaceId));
    const detail = await person.agent.get(`${portal(workspaceId)}/${sent}`);

    expect(Object.keys(list.body.invoices[0]).sort()).toEqual(listKeys);
    expect(Object.keys(detail.body.invoice).sort()).toEqual([...listKeys, "items"].sort());
    expect(Object.keys(detail.body.invoice.items[0]).sort()).toEqual([
      "description",
      "lineTotalMinor",
      "quantity",
      "unitPriceMinor",
    ]);
    expect(detail.body.invoice.label).toBe("INV-0001");
    expect(detail.body.invoice.totalMinor).toBe(11800);
  });

  it("answers the same 404 for a draft, another client's invoice and a missing one", async () => {
    const { workspaceId, person, draft, other } = await setup();
    const missing = "00000000-0000-4000-8000-000000000000";

    for (const id of [draft, other, missing, "not-a-uuid"]) {
      const detail = await person.agent.get(`${portal(workspaceId)}/${id}`);
      const pdf = await person.agent.get(`${portal(workspaceId)}/${id}/pdf`);

      expect(detail.status).toBe(404);
      expect(detail.body.error.code).toBe("INVOICE_NOT_FOUND");
      expect(pdf.status).toBe(404);
    }
  });

  it("downloads the PDF of a sent invoice", async () => {
    const { workspaceId, person, sent } = await setup();

    const res = await person.agent
      .get(`${portal(workspaceId)}/${sent}/pdf`)
      .buffer(true)
      .parse(binary);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="INV-0001.pdf"');
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.body.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("marks a sent invoice that is past its due date as overdue", async () => {
    const { owner, workspaceId, clientA, person } = await setup();

    await makeInvoice(owner, workspaceId, clientA, {
      send: true,
      overrides: { issueDate: "2020-01-01", dueDate: "2020-02-01" },
    });

    const res = await person.agent.get(portal(workspaceId));
    const overdue = res.body.invoices.filter((invoice) => {
      return invoice.overdue;
    });

    expect(overdue).toHaveLength(1);
    expect(overdue[0].status).toBe("sent");
  });

  it("stops showing invoices when access is removed or the client is archived", async () => {
    const { owner, workspaceId, clientA, person, sent } = await setup();

    await db("clients").where({ id: clientA }).update({ archived_at: db.fn.now() });

    const archivedList = await person.agent.get(portal(workspaceId));
    const archivedDetail = await person.agent.get(`${portal(workspaceId)}/${sent}`);

    await db("clients").where({ id: clientA }).update({ archived_at: null });
    await owner.agent.delete(
      `${base(workspaceId)}/clients/${clientA}/access/${person.res.body.user.id}`,
    );

    const revokedList = await person.agent.get(portal(workspaceId));
    const revokedPdf = await person.agent.get(`${portal(workspaceId)}/${sent}/pdf`);

    expect(archivedList.body.invoices).toEqual([]);
    expect(archivedDetail.status).toBe(404);
    expect(revokedList.body.invoices).toEqual([]);
    expect(revokedPdf.status).toBe(404);
  });

  it("can't be widened with a client filter", async () => {
    const { workspaceId, clientA, clientB, person } = await setup();

    const own = await person.agent.get(`${portal(workspaceId)}?clientId=${clientA}`);
    const foreign = await person.agent.get(`${portal(workspaceId)}?clientId=${clientB}`);

    expect(own.body.total).toBe(2);
    expect(foreign.status).toBe(200);
    expect(foreign.body.invoices).toEqual([]);
  });

  it("shows nothing to a client user with no access, and refuses team roles and outsiders", async () => {
    const { owner, workspaceId, sent } = await setup();
    const stranger = await addMemberTo(workspaceId, "client");
    const member = await addMemberTo(workspaceId, "member");
    const outsider = await createWorkspace("Outside");

    const empty = await stranger.agent.get(portal(workspaceId));
    const blocked = await stranger.agent.get(`${portal(workspaceId)}/${sent}`);

    expect(empty.status).toBe(200);
    expect(empty.body.invoices).toEqual([]);
    expect(blocked.status).toBe(404);
    expect((await owner.agent.get(portal(workspaceId))).status).toBe(403);
    expect((await member.agent.get(portal(workspaceId))).status).toBe(403);
    expect((await outsider.owner.agent.get(portal(workspaceId))).status).toBe(404);
  });
});
