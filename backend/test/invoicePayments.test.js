import { describe, expect, it } from "vitest";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const invoiceUrl = (workspaceId, id) => {
  return `${base(workspaceId)}/invoices/${id}`;
};

const makeClient = async (owner, workspaceId, companyName) => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

// An invoice for 118.00: 2 x 50.00 plus 18% tax. Sent unless told otherwise.
const newInvoice = async (owner, workspaceId, clientId, { send = true } = {}) => {
  const created = await owner.agent.post(`${base(workspaceId)}/invoices`).send({
    clientId,
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2099-12-16",
    taxRateBps: 1800,
    items: [{ description: "Design", quantity: "2", unitPriceMinor: 5000 }],
  });
  const id = created.body.invoice.id;

  if (send) {
    await owner.agent.post(`${invoiceUrl(workspaceId, id)}/send`);
  }

  return id;
};

const pay = (owner, workspaceId, id, overrides = {}) => {
  return owner.agent.post(`${invoiceUrl(workspaceId, id)}/payments`).send({
    amountMinor: 5000,
    paidOn: "2026-11-20",
    method: "bank_transfer",
    reference: "Wire 1042",
    ...overrides,
  });
};

const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Payments Studio");
  const clientId = await makeClient(owner, workspaceId, "Alpha Co");
  const id = await newInvoice(owner, workspaceId, clientId);

  return { owner, workspaceId, clientId, id };
};

describe("invoice payments", () => {
  it("takes a part payment, then the rest, and marks the invoice paid", async () => {
    const { owner, workspaceId, id } = await setup();

    const part = await pay(owner, workspaceId, id);

    expect(part.status).toBe(201);
    expect(part.body.invoice.status).toBe("sent");
    expect(part.body.invoice.amountPaidMinor).toBe(5000);
    expect(part.body.invoice.balanceMinor).toBe(6800);
    expect(part.body.invoice.paidAt).toBeNull();
    expect(part.body.invoice.payments).toHaveLength(1);
    expect(part.body.invoice.payments[0]).toMatchObject({
      amountMinor: 5000,
      paidOn: "2026-11-20",
      method: "bank_transfer",
      reference: "Wire 1042",
    });

    const rest = await pay(owner, workspaceId, id, {
      amountMinor: 6800,
      method: "cash",
      reference: "",
    });

    expect(rest.status).toBe(201);
    expect(rest.body.invoice.status).toBe("paid");
    expect(rest.body.invoice.paidAt).not.toBeNull();
    expect(rest.body.invoice.balanceMinor).toBe(0);
    expect(rest.body.invoice.overdue).toBe(false);
    expect(rest.body.invoice.payments).toHaveLength(2);
    expect(rest.body.invoice.payments[1].reference).toBeNull();

    const paid = await owner.agent.get(`${base(workspaceId)}/invoices?status=paid`);

    expect(paid.body.total).toBe(1);
    expect(paid.body.invoices[0].amountPaidMinor).toBe(11800);
  });

  it("refuses more than is owed and invalid payments", async () => {
    const { owner, workspaceId, id } = await setup();

    const over = await pay(owner, workspaceId, id, { amountMinor: 11801 });

    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe("VALIDATION_ERROR");
    expect(over.body.error.details.fields.amountMinor).toBeTruthy();

    const bad = [
      { amountMinor: 0 },
      { amountMinor: -5 },
      { amountMinor: 12.5 },
      { method: "bitcoin" },
      { paidOn: "2026-13-40" },
      { reference: "x".repeat(201) },
    ];

    for (const overrides of bad) {
      const res = await pay(owner, workspaceId, id, overrides);

      expect(res.status).toBe(400);
    }

    const after = await owner.agent.get(invoiceUrl(workspaceId, id));

    expect(after.body.invoice.payments).toEqual([]);
    expect(after.body.invoice.amountPaidMinor).toBe(0);
  });

  it("removes a payment and reopens a paid invoice", async () => {
    const { owner, workspaceId, id } = await setup();
    const full = await pay(owner, workspaceId, id, { amountMinor: 11800 });
    const paymentId = full.body.invoice.payments[0].id;
    const missing = "00000000-0000-4000-8000-000000000000";

    expect(full.body.invoice.status).toBe("paid");

    const unknown = await owner.agent.delete(`${invoiceUrl(workspaceId, id)}/payments/${missing}`);
    const badId = await owner.agent.delete(`${invoiceUrl(workspaceId, id)}/payments/not-a-uuid`);

    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("PAYMENT_NOT_FOUND");
    expect(badId.status).toBe(404);

    const removed = await owner.agent.delete(
      `${invoiceUrl(workspaceId, id)}/payments/${paymentId}`,
    );

    expect(removed.status).toBe(200);
    expect(removed.body.invoice.status).toBe("sent");
    expect(removed.body.invoice.paidAt).toBeNull();
    expect(removed.body.invoice.amountPaidMinor).toBe(0);
    expect(removed.body.invoice.payments).toEqual([]);
  });

  it("only takes payments on a sent invoice", async () => {
    const { owner, workspaceId, clientId, id } = await setup();
    const draft = await newInvoice(owner, workspaceId, clientId, { send: false });
    const voided = await newInvoice(owner, workspaceId, clientId);

    await owner.agent.post(`${invoiceUrl(workspaceId, voided)}/void`);
    await pay(owner, workspaceId, id, { amountMinor: 11800 });

    const onDraft = await pay(owner, workspaceId, draft);
    const onVoid = await pay(owner, workspaceId, voided);
    const onPaid = await pay(owner, workspaceId, id, { amountMinor: 100 });

    expect(onDraft.status).toBe(409);
    expect(onDraft.body.error.code).toBe("INVOICE_NOT_PAYABLE");
    expect(onVoid.status).toBe(409);
    expect(onVoid.body.error.code).toBe("INVOICE_NOT_PAYABLE");
    expect(onPaid.status).toBe(409);
    expect(onPaid.body.error.code).toBe("INVOICE_ALREADY_PAID");
  });

  it("won't void an invoice that has payments", async () => {
    const { owner, workspaceId, id } = await setup();
    const url = invoiceUrl(workspaceId, id);
    const part = await pay(owner, workspaceId, id, { amountMinor: 1000 });

    const blocked = await owner.agent.post(`${url}/void`);

    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("INVOICE_HAS_PAYMENTS");

    await owner.agent.delete(`${url}/payments/${part.body.invoice.payments[0].id}`);

    const allowed = await owner.agent.post(`${url}/void`);

    expect(allowed.status).toBe(200);
    expect(allowed.body.invoice.status).toBe("void");
  });

  it("can't be overpaid by two payments at the same moment", async () => {
    const { owner, workspaceId, id } = await setup();

    const results = await Promise.all([
      pay(owner, workspaceId, id, { amountMinor: 7000 }),
      pay(owner, workspaceId, id, { amountMinor: 7000 }),
    ]);
    const statuses = results
      .map((res) => {
        return res.status;
      })
      .sort();
    const after = await owner.agent.get(invoiceUrl(workspaceId, id));

    expect(statuses).toEqual([201, 400]);
    expect(after.body.invoice.amountPaidMinor).toBe(7000);
    expect(after.body.invoice.payments).toHaveLength(1);
  });

  it("is only for owners and admins, and stays inside its workspace", async () => {
    const { owner, workspaceId, id } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const person = await addMemberTo(workspaceId, "client");
    const outside = await createWorkspace("Outside");
    const recorded = await pay(owner, workspaceId, id);
    const paymentId = recorded.body.invoice.payments[0].id;
    const paymentUrl = `${invoiceUrl(workspaceId, id)}/payments/${paymentId}`;

    expect((await pay(member, workspaceId, id)).status).toBe(403);
    expect((await pay(person, workspaceId, id)).status).toBe(403);
    expect((await pay(outside.owner, workspaceId, id)).status).toBe(404);
    expect((await member.agent.delete(paymentUrl)).status).toBe(403);
    expect((await outside.owner.agent.delete(paymentUrl)).status).toBe(404);

    // Another workspace's owner can't reach this invoice through their own workspace either.
    const foreign = await pay(outside.owner, outside.workspaceId, id);

    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("INVOICE_NOT_FOUND");

    const after = await owner.agent.get(invoiceUrl(workspaceId, id));

    expect(after.body.invoice.payments).toHaveLength(1);
  });

  it("shows a client what has been paid, without the payment details", async () => {
    const { owner, workspaceId, clientId, id } = await setup();
    const person = await addMemberTo(workspaceId, "client");

    await owner.agent
      .post(`${base(workspaceId)}/clients/${clientId}/access`)
      .send({ userId: person.res.body.user.id });
    await pay(owner, workspaceId, id);

    const part = await person.agent.get(`${base(workspaceId)}/portal/invoices/${id}`);

    expect(part.status).toBe(200);
    expect(part.body.invoice.status).toBe("sent");
    expect(part.body.invoice.amountPaidMinor).toBe(5000);
    expect(part.body.invoice.balanceMinor).toBe(6800);
    expect(part.body.invoice).not.toHaveProperty("payments");

    await pay(owner, workspaceId, id, { amountMinor: 6800 });

    const list = await person.agent.get(`${base(workspaceId)}/portal/invoices`);

    expect(list.body.invoices[0].status).toBe("paid");
    expect(list.body.invoices[0].balanceMinor).toBe(0);
    expect(JSON.stringify(list.body)).not.toContain("Wire 1042");
  });
});
