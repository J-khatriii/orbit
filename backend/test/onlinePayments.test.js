import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/stripeConnect.js", async (importOriginal) => {
  const original = await importOriginal();

  return {
    ...original,
    createCheckoutSession: vi.fn(async ({ accountId }) => {
      return `https://checkout.stripe.test/pay/${accountId}`;
    }),
  };
});

import { db } from "../src/db/knex.js";
import * as stripeConnect from "../src/lib/stripeConnect.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const invoiceUrl = (workspaceId, id) => {
  return `${base(workspaceId)}/invoices/${id}`;
};

const portalUrl = (workspaceId, id) => {
  return `${base(workspaceId)}/portal/invoices/${id}`;
};

const makeClient = async (owner, workspaceId, companyName) => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

const grantAccess = async (owner, workspaceId, clientId, person) => {
  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/access`)
    .send({ userId: person.res.body.user.id });
};

// 118.00 USD by default: 2 x 50.00 plus 18% tax. Sent unless told otherwise.
const newInvoice = async (owner, workspaceId, clientId, options = {}) => {
  const created = await owner.agent.post(`${base(workspaceId)}/invoices`).send({
    clientId,
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2099-12-16",
    taxRateBps: 1800,
    items: [{ description: "Design", quantity: "2", unitPriceMinor: 5000 }],
    ...options.overrides,
  });
  const id = created.body.invoice.id;

  if (options.send !== false) {
    await owner.agent.post(`${invoiceUrl(workspaceId, id)}/send`);
  }

  return id;
};

const connectAccount = async (workspaceId, { chargesEnabled = true } = {}) => {
  const accountId = `acct_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;

  await db("stripe_accounts").insert({
    workspace_id: workspaceId,
    livemode: false,
    stripe_account_id: accountId,
    charges_enabled: chargesEnabled,
    details_submitted: chargesEnabled,
    country: "IN",
  });

  return accountId;
};

// A workspace with one client, a portal user for that client, and a sent invoice.
const setup = async ({ connect = true } = {}) => {
  const { owner, workspaceId } = await createWorkspace("Pay Online");
  const clientId = await makeClient(owner, workspaceId, "Alpha Co");
  const person = await addMemberTo(workspaceId, "client");

  await grantAccess(owner, workspaceId, clientId, person);

  const id = await newInvoice(owner, workspaceId, clientId);
  const accountId = connect ? await connectAccount(workspaceId) : null;

  return { owner, workspaceId, clientId, person, id, accountId };
};

const checkout = (person, workspaceId, id) => {
  return person.agent.post(`${portalUrl(workspaceId, id)}/checkout`);
};

describe("paying an invoice online", () => {
  beforeEach(() => {
    stripeConnect.createCheckoutSession.mockClear();
  });

  it("starts a Checkout on the agency's own account for the whole balance", async () => {
    const { workspaceId, person, id, accountId } = await setup();

    const res = await checkout(person, workspaceId, id);

    expect(res.status).toBe(200);
    expect(res.body.url).toBe(`https://checkout.stripe.test/pay/${accountId}`);
    expect(stripeConnect.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(stripeConnect.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId,
        workspaceId,
        invoiceId: id,
        label: "INV-0001",
        workspaceName: "Pay Online",
        currency: "USD",
        amount: 11800,
      }),
    );

    const call = stripeConnect.createCheckoutSession.mock.calls[0][0];

    expect(call.successUrl).toContain(`/portal/invoices/${id}?payment=success`);
    expect(call.cancelUrl).toContain(`/portal/invoices/${id}?payment=cancelled`);
  });

  it("charges only what is still owed", async () => {
    const { owner, workspaceId, person, id } = await setup();

    await owner.agent.post(`${invoiceUrl(workspaceId, id)}/payments`).send({
      amountMinor: 5000,
      paidOn: "2026-11-20",
      method: "cash",
    });

    const res = await checkout(person, workspaceId, id);

    expect(res.status).toBe(200);
    expect(stripeConnect.createCheckoutSession.mock.calls[0][0].amount).toBe(6800);
  });

  it("tells the portal whether the invoice can be paid online", async () => {
    const ready = await setup();
    const notConnected = await setup({ connect: false });

    const yes = await ready.person.agent.get(portalUrl(ready.workspaceId, ready.id));
    const no = await notConnected.person.agent.get(
      portalUrl(notConnected.workspaceId, notConnected.id),
    );

    expect(yes.body.invoice.canPayOnline).toBe(true);
    expect(no.body.invoice.canPayOnline).toBe(false);

    await ready.owner.agent.post(`${invoiceUrl(ready.workspaceId, ready.id)}/payments`).send({
      amountMinor: 11800,
      paidOn: "2026-11-20",
      method: "cash",
    });

    const paid = await ready.person.agent.get(portalUrl(ready.workspaceId, ready.id));

    expect(paid.body.invoice.status).toBe("paid");
    expect(paid.body.invoice.canPayOnline).toBe(false);
  });

  it("refuses when the invoice can't be paid online", async () => {
    const ready = await setup();
    const notConnected = await setup({ connect: false });
    const notReady = await setup({ connect: false });
    const voided = await setup();

    await connectAccount(notReady.workspaceId, { chargesEnabled: false });
    await ready.owner.agent.post(`${invoiceUrl(ready.workspaceId, ready.id)}/payments`).send({
      amountMinor: 11800,
      paidOn: "2026-11-20",
      method: "cash",
    });
    await voided.owner.agent.post(`${invoiceUrl(voided.workspaceId, voided.id)}/void`);

    const unavailable = await checkout(
      notConnected.person,
      notConnected.workspaceId,
      notConnected.id,
    );
    const stillOnboarding = await checkout(notReady.person, notReady.workspaceId, notReady.id);
    const paid = await checkout(ready.person, ready.workspaceId, ready.id);
    const voidRes = await checkout(voided.person, voided.workspaceId, voided.id);

    expect(unavailable.status).toBe(409);
    expect(unavailable.body.error.code).toBe("ONLINE_PAYMENTS_UNAVAILABLE");
    expect(stillOnboarding.status).toBe(409);
    expect(stillOnboarding.body.error.code).toBe("ONLINE_PAYMENTS_UNAVAILABLE");
    expect(paid.status).toBe(409);
    expect(paid.body.error.code).toBe("INVOICE_NOT_PAYABLE");
    expect(voidRes.status).toBe(409);
    expect(voidRes.body.error.code).toBe("INVOICE_NOT_PAYABLE");
    expect(stripeConnect.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("doesn't offer an amount Stripe can't take in a three-decimal currency", async () => {
    const { owner, workspaceId, clientId, person } = await setup();
    const odd = await newInvoice(owner, workspaceId, clientId, {
      overrides: {
        currency: "KWD",
        taxRateBps: 0,
        items: [{ description: "Odd amount", quantity: "1", unitPriceMinor: 1005 }],
      },
    });
    const even = await newInvoice(owner, workspaceId, clientId, {
      overrides: {
        currency: "KWD",
        taxRateBps: 0,
        items: [{ description: "Even amount", quantity: "1", unitPriceMinor: 1000 }],
      },
    });

    const refused = await checkout(person, workspaceId, odd);
    const offered = await person.agent.get(portalUrl(workspaceId, even));

    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("ONLINE_PAYMENTS_UNAVAILABLE");
    expect(offered.body.invoice.canPayOnline).toBe(true);
  });

  it("only lets the invoice's own client pay, never drafts, other clients or other roles", async () => {
    const { owner, workspaceId, clientId, person, id } = await setup();
    const otherClient = await makeClient(owner, workspaceId, "Beta Co");
    const theirs = await newInvoice(owner, workspaceId, otherClient);
    const draft = await newInvoice(owner, workspaceId, clientId, { send: false });
    const stranger = await addMemberTo(workspaceId, "client");
    const member = await addMemberTo(workspaceId, "member");
    const outside = await createWorkspace("Outside");
    const missing = "00000000-0000-4000-8000-000000000000";

    for (const target of [theirs, draft, missing, "not-a-uuid"]) {
      const res = await checkout(person, workspaceId, target);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("INVOICE_NOT_FOUND");
    }

    expect((await checkout(stranger, workspaceId, id)).status).toBe(404);
    expect((await checkout(owner, workspaceId, id)).status).toBe(403);
    expect((await checkout(member, workspaceId, id)).status).toBe(403);
    expect((await checkout(outside.owner, workspaceId, id)).status).toBe(404);
    expect(stripeConnect.createCheckoutSession).not.toHaveBeenCalled();
  });
});
