import request from "supertest";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/knex.js";
import { createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";
const SECRET = "whsec_vitest_placeholder";
const CREATED = 1795000000;

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const invoiceUrl = (workspaceId, id) => {
  return `${base(workspaceId)}/invoices/${id}`;
};

const signed = (event) => {
  const payload = JSON.stringify(event);

  return {
    payload,
    header: Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }),
  };
};

const sendRaw = (payload, header) => {
  const call = request(app).post("/api/v1/webhooks/stripe").set("Content-Type", "application/json");

  return (header ? call.set("Stripe-Signature", header) : call).send(payload);
};

const send = (event) => {
  const { payload, header } = signed(event);

  return sendRaw(payload, header);
};

const connectAccount = async (workspaceId) => {
  const accountId = `acct_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;

  await db("stripe_accounts").insert({
    workspace_id: workspaceId,
    livemode: false,
    stripe_account_id: accountId,
    charges_enabled: true,
    details_submitted: true,
    country: "IN",
  });

  return accountId;
};

// A workspace with a connected account and a sent invoice of 118.00 USD.
const setup = async (name = "Webhook Studio") => {
  const { owner, workspaceId } = await createWorkspace(name);
  const client = await owner.agent
    .post(`${base(workspaceId)}/clients`)
    .send({ companyName: "Alpha Co" });
  const created = await owner.agent.post(`${base(workspaceId)}/invoices`).send({
    clientId: client.body.client.id,
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2099-12-16",
    taxRateBps: 1800,
    items: [{ description: "Design", quantity: "2", unitPriceMinor: 5000 }],
  });
  const id = created.body.invoice.id;

  await owner.agent.post(`${invoiceUrl(workspaceId, id)}/send`);

  const accountId = await connectAccount(workspaceId);

  return { owner, workspaceId, id, accountId };
};

const checkoutEvent = ({ workspaceId, invoiceId, account, ...overrides }) => {
  return {
    id: overrides.eventId ?? "evt_1",
    object: "event",
    type: overrides.type ?? "checkout.session.completed",
    livemode: overrides.livemode ?? false,
    account,
    created: CREATED,
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        payment_status: overrides.paymentStatus ?? "paid",
        amount_total: overrides.amount ?? 11800,
        currency: overrides.currency ?? "usd",
        payment_intent: overrides.intent ?? "pi_test_1",
        metadata: {
          orbit_workspace_id: overrides.metaWorkspaceId ?? workspaceId,
          orbit_invoice_id: overrides.metaInvoiceId ?? invoiceId,
        },
      },
    },
  };
};

const read = async (owner, workspaceId, id) => {
  const res = await owner.agent.get(invoiceUrl(workspaceId, id));

  return res.body.invoice;
};

describe("stripe webhook", () => {
  it("records an online payment and marks the invoice paid", async () => {
    const { owner, workspaceId, id, accountId } = await setup();

    const res = await send(checkoutEvent({ workspaceId, invoiceId: id, account: accountId }));
    const invoice = await read(owner, workspaceId, id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(invoice.status).toBe("paid");
    expect(invoice.paidAt).not.toBeNull();
    expect(invoice.amountPaidMinor).toBe(11800);
    expect(invoice.balanceMinor).toBe(0);
    expect(invoice.payments).toHaveLength(1);
    expect(invoice.payments[0]).toMatchObject({
      amountMinor: 11800,
      method: "online",
      source: "stripe",
      paidOn: new Date(CREATED * 1000).toISOString().slice(0, 10),
      recordedByName: null,
    });
  });

  it("records a part payment and leaves the invoice open", async () => {
    const { owner, workspaceId, id, accountId } = await setup();

    await send(checkoutEvent({ workspaceId, invoiceId: id, account: accountId, amount: 5000 }));

    const invoice = await read(owner, workspaceId, id);

    expect(invoice.status).toBe("sent");
    expect(invoice.amountPaidMinor).toBe(5000);
    expect(invoice.balanceMinor).toBe(6800);
  });

  it("counts a payment once however many times Stripe sends it", async () => {
    const { owner, workspaceId, id, accountId } = await setup();
    const event = checkoutEvent({ workspaceId, invoiceId: id, account: accountId });
    const later = checkoutEvent({
      workspaceId,
      invoiceId: id,
      account: accountId,
      eventId: "evt_2",
      type: "checkout.session.async_payment_succeeded",
    });

    expect((await send(event)).status).toBe(200);
    expect((await send(event)).status).toBe(200);
    expect((await send(later)).status).toBe(200);

    const invoice = await read(owner, workspaceId, id);

    expect(invoice.payments).toHaveLength(1);
    expect(invoice.amountPaidMinor).toBe(11800);
  });

  it("waits for delayed payment methods to actually pay", async () => {
    const { owner, workspaceId, id, accountId } = await setup();
    const pending = checkoutEvent({
      workspaceId,
      invoiceId: id,
      account: accountId,
      paymentStatus: "unpaid",
    });
    const failed = checkoutEvent({
      workspaceId,
      invoiceId: id,
      account: accountId,
      eventId: "evt_2",
      type: "checkout.session.async_payment_failed",
      paymentStatus: "unpaid",
    });

    expect((await send(pending)).status).toBe(200);
    expect((await send(failed)).status).toBe(200);
    expect((await read(owner, workspaceId, id)).payments).toEqual([]);

    const succeeded = checkoutEvent({
      workspaceId,
      invoiceId: id,
      account: accountId,
      eventId: "evt_3",
      type: "checkout.session.async_payment_succeeded",
    });

    await send(succeeded);

    expect((await read(owner, workspaceId, id)).status).toBe("paid");
  });

  it("rejects anything that isn't signed by Stripe", async () => {
    const { owner, workspaceId, id, accountId } = await setup();
    const event = checkoutEvent({ workspaceId, invoiceId: id, account: accountId });
    const { payload } = signed(event);
    const wrongSecret = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_someone_else",
    });
    const other = signed(
      checkoutEvent({ workspaceId, invoiceId: id, account: accountId, amount: 1 }),
    );

    const forged = await sendRaw(payload, wrongSecret);
    const unsigned = await sendRaw(payload);
    const tampered = await sendRaw(payload, other.header);

    for (const res of [forged, unsigned, tampered]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_SIGNATURE");
    }

    expect((await read(owner, workspaceId, id)).payments).toEqual([]);
  });

  it("ignores events from another account, even ones that name this invoice", async () => {
    const { owner, workspaceId, id, accountId } = await setup();
    const other = await setup("Other Studio");
    const attempts = [
      // Another workspace's Stripe account naming this workspace's invoice.
      checkoutEvent({ workspaceId, invoiceId: id, account: other.accountId, intent: "pi_a" }),
      // No account at all, as for the platform's own events.
      checkoutEvent({ workspaceId, invoiceId: id, account: undefined, intent: "pi_b" }),
      // The right account in the wrong currency.
      checkoutEvent({
        workspaceId,
        invoiceId: id,
        account: accountId,
        currency: "eur",
        intent: "pi_c",
      }),
      // A live-mode event while the server is in sandbox mode.
      checkoutEvent({
        workspaceId,
        invoiceId: id,
        account: accountId,
        livemode: true,
        intent: "pi_d",
      }),
      // An invoice that doesn't exist, and metadata that isn't Orbit's.
      checkoutEvent({
        workspaceId,
        invoiceId: id,
        account: accountId,
        metaInvoiceId: "00000000-0000-4000-8000-000000000000",
        intent: "pi_e",
      }),
      checkoutEvent({ workspaceId, invoiceId: id, account: accountId, metaWorkspaceId: "nope" }),
    ];

    for (const event of attempts) {
      expect((await send(event)).status).toBe(200);
    }

    expect((await read(owner, workspaceId, id)).payments).toEqual([]);
    expect((await read(other.owner, other.workspaceId, other.id)).payments).toEqual([]);
  });

  it("ignores events it doesn't use", async () => {
    const { owner, workspaceId, id, accountId } = await setup();

    const res = await send({
      ...checkoutEvent({ workspaceId, invoiceId: id, account: accountId }),
      type: "payment_intent.succeeded",
    });

    expect(res.status).toBe(200);
    expect((await read(owner, workspaceId, id)).payments).toEqual([]);
  });

  it("keeps money that arrives for an invoice that is already paid or void", async () => {
    const { owner, workspaceId, id, accountId } = await setup();

    await owner.agent.post(`${invoiceUrl(workspaceId, id)}/payments`).send({
      amountMinor: 11800,
      paidOn: "2026-11-20",
      method: "cash",
    });
    await send(checkoutEvent({ workspaceId, invoiceId: id, account: accountId }));

    const paid = await read(owner, workspaceId, id);

    expect(paid.status).toBe("paid");
    expect(paid.payments).toHaveLength(2);
    expect(paid.balanceMinor).toBe(0);

    const second = await setup("Void Studio");

    await second.owner.agent.post(`${invoiceUrl(second.workspaceId, second.id)}/void`);
    await send(
      checkoutEvent({
        workspaceId: second.workspaceId,
        invoiceId: second.id,
        account: second.accountId,
        intent: "pi_void",
      }),
    );

    const rows = await db("invoice_payments").where({ invoice_id: second.id });
    const voided = await db("invoices").where({ id: second.id }).first(["status"]);

    expect(rows).toHaveLength(1);
    expect(voided.status).toBe("void");
  });

  it("can't be removed from Orbit once it is an online payment", async () => {
    const { owner, workspaceId, id, accountId } = await setup();

    await send(checkoutEvent({ workspaceId, invoiceId: id, account: accountId }));

    const invoice = await read(owner, workspaceId, id);
    const res = await owner.agent.delete(
      `${invoiceUrl(workspaceId, id)}/payments/${invoice.payments[0].id}`,
    );

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ONLINE_PAYMENT_LOCKED");
    expect((await read(owner, workspaceId, id)).payments).toHaveLength(1);
  });
});
