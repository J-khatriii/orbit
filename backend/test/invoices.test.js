import { describe, expect, it } from "vitest";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const makeClient = async (owner, workspaceId, companyName = "Alpha Co") => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

const LINES = [
  { description: "Design", quantity: "2", unitPriceMinor: 5000 },
  { description: "Development", quantity: "1.5", unitPriceMinor: 3333 },
];

const body = (clientId, overrides = {}) => {
  return {
    clientId,
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2026-12-16",
    taxRateBps: 1800,
    items: LINES,
    ...overrides,
  };
};

const invoicesUrl = (workspaceId) => {
  return `${base(workspaceId)}/invoices`;
};

const create = async (owner, workspaceId, clientId, overrides) => {
  const res = await owner.agent.post(invoicesUrl(workspaceId)).send(body(clientId, overrides));

  return res.body.invoice;
};

const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Invoice Studio");
  const clientId = await makeClient(owner, workspaceId);

  return { owner, workspaceId, clientId };
};

describe("invoices", () => {
  it("creates a draft and works out every amount on the server", async () => {
    const { owner, workspaceId, clientId } = await setup();

    // The browser's own idea of the totals is ignored.
    const res = await owner.agent
      .post(invoicesUrl(workspaceId))
      .send({ ...body(clientId), totalMinor: 1, subtotalMinor: 1 });

    expect(res.status).toBe(201);
    expect(res.body.invoice.status).toBe("draft");
    expect(res.body.invoice.number).toBeNull();
    expect(res.body.invoice.label).toBeNull();
    expect(res.body.invoice.subtotalMinor).toBe(15000);
    expect(res.body.invoice.taxMinor).toBe(2700);
    expect(res.body.invoice.totalMinor).toBe(17700);
    expect(
      res.body.invoice.items.map((item) => {
        return [item.quantity, item.lineTotalMinor];
      }),
    ).toEqual([
      ["2", 10000],
      ["1.5", 5000],
    ]);
  });

  it("rejects invalid input", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const line = LINES[0];
    const bad = [
      { items: [{ ...line, quantity: "abc" }] },
      { items: [{ ...line, unitPriceMinor: -5 }] },
      { items: [{ ...line, unitPriceMinor: 10.5 }] },
      { items: [{ ...line, description: "  " }] },
      {
        items: Array.from({ length: 101 }, () => {
          return line;
        }),
      },
      { currency: "usd" },
      { taxRateBps: 10001 },
      { dueDate: "2026-11-01" },
      { issueDate: "2026-02-31" },
    ];

    for (const overrides of bad) {
      const res = await owner.agent.post(invoicesUrl(workspaceId)).send(body(clientId, overrides));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("only accepts this workspace's clients and the client's own projects", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const other = await createWorkspace("Other Studio");
    const foreignClient = await makeClient(other.owner, other.workspaceId);
    const otherClient = await makeClient(owner, workspaceId, "Beta Co");
    const project = await owner.agent
      .post(`${base(workspaceId)}/projects`)
      .send({ clientId: otherClient, name: "Their site" });

    const wrongWorkspace = await owner.agent
      .post(invoicesUrl(workspaceId))
      .send(body(foreignClient));
    const wrongProject = await owner.agent
      .post(invoicesUrl(workspaceId))
      .send(body(clientId, { projectId: project.body.project.id }));

    expect(wrongWorkspace.status).toBe(400);
    expect(wrongWorkspace.body.error.details.fields.clientId).toBeTruthy();
    expect(wrongProject.status).toBe(400);
    expect(wrongProject.body.error.details.fields.projectId).toBeTruthy();
  });

  it("edits a draft and works the totals out again", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const draft = await create(owner, workspaceId, clientId);
    const url = `${invoicesUrl(workspaceId)}/${draft.id}`;

    const noTax = await owner.agent.patch(url).send({ taxRateBps: 0 });
    const newLines = await owner.agent
      .patch(url)
      .send({ items: [{ description: "One thing", quantity: 1, unitPriceMinor: 1000 }] });
    const backwards = await owner.agent.patch(url).send({ dueDate: "2026-11-01" });
    const empty = await owner.agent.patch(url).send({});

    expect(noTax.body.invoice.subtotalMinor).toBe(15000);
    expect(noTax.body.invoice.taxMinor).toBe(0);
    expect(noTax.body.invoice.totalMinor).toBe(15000);
    expect(noTax.body.invoice.items).toHaveLength(2);
    expect(newLines.body.invoice.items).toHaveLength(1);
    expect(newLines.body.invoice.totalMinor).toBe(1000);
    expect(backwards.status).toBe(400);
    expect(empty.status).toBe(400);
  });

  it("numbers invoices when they're sent, once per workspace", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const other = await createWorkspace("Other Studio");
    const otherClient = await makeClient(other.owner, other.workspaceId);
    const first = await create(owner, workspaceId, clientId);
    const second = await create(owner, workspaceId, clientId);
    const foreign = await create(other.owner, other.workspaceId, otherClient);

    // Sent in the reverse of the order they were created.
    const sentSecond = await owner.agent.post(`${invoicesUrl(workspaceId)}/${second.id}/send`);
    const sentFirst = await owner.agent.post(`${invoicesUrl(workspaceId)}/${first.id}/send`);
    const sentForeign = await other.owner.agent.post(
      `${invoicesUrl(other.workspaceId)}/${foreign.id}/send`,
    );

    expect(sentSecond.status).toBe(200);
    expect(sentSecond.body.invoice.number).toBe(1);
    expect(sentSecond.body.invoice.label).toBe("INV-0001");
    expect(sentSecond.body.invoice.status).toBe("sent");
    expect(sentSecond.body.invoice.sentAt).toBeTruthy();
    expect(sentFirst.body.invoice.label).toBe("INV-0002");
    expect(sentForeign.body.invoice.label).toBe("INV-0001");
  });

  it("won't send an invoice with no lines or no total", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const empty = await create(owner, workspaceId, clientId, { items: [] });
    const free = await create(owner, workspaceId, clientId, {
      items: [{ description: "Gift", quantity: 1, unitPriceMinor: 0 }],
    });

    const noLines = await owner.agent.post(`${invoicesUrl(workspaceId)}/${empty.id}/send`);
    const noTotal = await owner.agent.post(`${invoicesUrl(workspaceId)}/${free.id}/send`);

    expect(noLines.status).toBe(400);
    expect(noTotal.status).toBe(400);
  });

  it("locks an invoice once it is sent", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const draft = await create(owner, workspaceId, clientId);
    const url = `${invoicesUrl(workspaceId)}/${draft.id}`;

    await owner.agent.post(`${url}/send`);

    const edit = await owner.agent.patch(url).send({ taxRateBps: 0 });
    const remove = await owner.agent.delete(url);
    const again = await owner.agent.post(`${url}/send`);

    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe("INVOICE_NOT_EDITABLE");
    expect(remove.status).toBe(409);
    expect(remove.body.error.code).toBe("INVOICE_NOT_DELETABLE");
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("INVOICE_NOT_DRAFT");
  });

  it("voids only a sent invoice, and keeps its number", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const draft = await create(owner, workspaceId, clientId);
    const url = `${invoicesUrl(workspaceId)}/${draft.id}`;

    const early = await owner.agent.post(`${url}/void`);

    await owner.agent.post(`${url}/send`);

    const voided = await owner.agent.post(`${url}/void`);
    const twice = await owner.agent.post(`${url}/void`);

    expect(early.status).toBe(409);
    expect(voided.status).toBe(200);
    expect(voided.body.invoice.status).toBe("void");
    expect(voided.body.invoice.label).toBe("INV-0001");
    expect(voided.body.invoice.voidedAt).toBeTruthy();
    expect(twice.status).toBe(409);
  });

  it("deletes a draft without using up a number", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const discarded = await create(owner, workspaceId, clientId);
    const url = `${invoicesUrl(workspaceId)}/${discarded.id}`;

    const removed = await owner.agent.delete(url);
    const gone = await owner.agent.get(url);
    const next = await create(owner, workspaceId, clientId);
    const sent = await owner.agent.post(`${invoicesUrl(workspaceId)}/${next.id}/send`);

    expect(removed.status).toBe(204);
    expect(gone.status).toBe(404);
    expect(gone.body.error.code).toBe("INVOICE_NOT_FOUND");
    expect(sent.body.invoice.label).toBe("INV-0001");
  });

  it("lists and filters by client and status, including overdue", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const otherClient = await makeClient(owner, workspaceId, "Beta Co");

    await create(owner, workspaceId, clientId);
    const current = await create(owner, workspaceId, clientId, { dueDate: "2099-01-01" });
    const late = await create(owner, workspaceId, otherClient, {
      issueDate: "2020-01-01",
      dueDate: "2020-02-01",
    });

    await owner.agent.post(`${invoicesUrl(workspaceId)}/${current.id}/send`);
    await owner.agent.post(`${invoicesUrl(workspaceId)}/${late.id}/send`);

    const all = await owner.agent.get(invoicesUrl(workspaceId));
    const forClient = await owner.agent.get(`${invoicesUrl(workspaceId)}?clientId=${clientId}`);
    const drafts = await owner.agent.get(`${invoicesUrl(workspaceId)}?status=draft`);
    const sent = await owner.agent.get(`${invoicesUrl(workspaceId)}?status=sent`);
    const overdue = await owner.agent.get(`${invoicesUrl(workspaceId)}?status=overdue`);
    const badStatus = await owner.agent.get(`${invoicesUrl(workspaceId)}?status=nonsense`);

    expect(all.body.total).toBe(3);
    expect(all.body.invoices[0]).not.toHaveProperty("items");
    expect(forClient.body.total).toBe(2);
    expect(drafts.body.total).toBe(1);
    expect(sent.body.total).toBe(2);
    expect(overdue.body.total).toBe(1);
    expect(overdue.body.invoices[0].id).toBe(late.id);
    expect(overdue.body.invoices[0].overdue).toBe(true);
    expect(badStatus.status).toBe(400);
  });

  it("gives every invoice sent at the same moment its own number", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const drafts = await Promise.all(
      [1, 2, 3, 4, 5].map(() => {
        return create(owner, workspaceId, clientId);
      }),
    );

    const results = await Promise.all(
      drafts.map((draft) => {
        return owner.agent.post(`${invoicesUrl(workspaceId)}/${draft.id}/send`);
      }),
    );

    expect(
      results.map((res) => {
        return res.status;
      }),
    ).toEqual([200, 200, 200, 200, 200]);
    expect(
      results
        .map((res) => {
          return res.body.invoice.number;
        })
        .sort(),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("is for owners and admins only, and stays inside its workspace", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const draft = await create(owner, workspaceId, clientId);
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");
    const person = await addMemberTo(workspaceId, "client");
    const other = await createWorkspace("Other Studio");
    const url = `${invoicesUrl(workspaceId)}/${draft.id}`;

    expect((await admin.agent.get(url)).status).toBe(200);
    expect((await member.agent.get(invoicesUrl(workspaceId))).status).toBe(403);
    expect((await member.agent.post(invoicesUrl(workspaceId)).send(body(clientId))).status).toBe(
      403,
    );
    expect((await person.agent.get(url)).status).toBe(403);
    expect((await other.owner.agent.get(url)).status).toBe(404);
    expect(
      (await other.owner.agent.get(`${invoicesUrl(other.workspaceId)}/${draft.id}`)).status,
    ).toBe(404);
    expect((await owner.agent.get(`${invoicesUrl(workspaceId)}/not-a-uuid`)).status).toBe(404);
  });
});
