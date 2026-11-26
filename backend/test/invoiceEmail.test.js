import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { sendEmail } from "../src/lib/mailer.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
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

const emailOf = async (person) => {
  const row = await db("users").where({ id: person.res.body.user.id }).first(["email"]);

  return row.email;
};

// A draft for 2 x 50.00 with 18% tax: 118.00 in total.
const newInvoice = async (owner, workspaceId, clientId) => {
  const res = await owner.agent.post(`${base(workspaceId)}/invoices`).send({
    clientId,
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2099-12-16",
    taxRateBps: 1800,
    items: [{ description: "Design", quantity: "2", unitPriceMinor: 5000 }],
  });

  return res.body.invoice.id;
};

const invoiceUrl = (workspaceId, id) => {
  return `${base(workspaceId)}/invoices/${id}`;
};

const sentTo = () => {
  return sendEmail.mock.calls
    .map(([message]) => {
      return message.to;
    })
    .sort();
};

// One client with one portal user, and a draft invoice for that client.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Invoice Emails");
  const clientId = await makeClient(owner, workspaceId, "Alpha Co");
  const person = await addMemberTo(workspaceId, "client");

  await grantAccess(owner, workspaceId, clientId, person);

  const id = await newInvoice(owner, workspaceId, clientId);

  return { owner, workspaceId, clientId, person, id };
};

describe("invoice emails", () => {
  beforeEach(() => {
    sendEmail.mockClear();
  });

  it("emails the portal users of the client when the invoice is sent, and nobody else", async () => {
    const { owner, workspaceId, clientId, person, id } = await setup();
    const second = await addMemberTo(workspaceId, "client");
    const otherClient = await makeClient(owner, workspaceId, "Beta Co");
    const outsider = await addMemberTo(workspaceId, "client");

    await grantAccess(owner, workspaceId, clientId, second);
    await grantAccess(owner, workspaceId, otherClient, outsider);
    await addMemberTo(workspaceId, "member");
    sendEmail.mockClear();

    const res = await owner.agent.post(`${invoiceUrl(workspaceId, id)}/send`);
    expect(res.status).toBe(200);
    expect(res.body.emailed).toBe(2);
    expect(res.body.invoice.emailCount).toBe(1);
    expect(res.body.invoice.lastEmailedAt).not.toBeNull();
    expect(sentTo()).toEqual([await emailOf(person), await emailOf(second)].sort());

    const message = sendEmail.mock.calls[0][0];

    expect(message.subject).toBe("Invoice INV-0001 from Invoice Emails");
    expect(message.text).toContain(`/portal/invoices/${id}`);
    expect(message.text).toContain("118.00");
  });

  it("sends the invoice without emailing when nobody has portal access", async () => {
    const { owner, workspaceId } = await createWorkspace("No Portal Users");
    const clientId = await makeClient(owner, workspaceId, "Alpha Co");
    const id = await newInvoice(owner, workspaceId, clientId);

    sendEmail.mockClear();

    const res = await owner.agent.post(`${invoiceUrl(workspaceId, id)}/send`);
    const again = await owner.agent.post(`${invoiceUrl(workspaceId, id)}/email`);

    expect(res.status).toBe(200);
    expect(res.body.invoice.status).toBe("sent");
    expect(res.body.emailed).toBe(0);
    expect(res.body.invoice.lastEmailedAt).toBeNull();
    expect(res.body.invoice.emailCount).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("NO_PORTAL_USERS");
  });

  it("emails again as a reminder, with a one minute cooldown", async () => {
    const { owner, workspaceId, id } = await setup();
    const url = invoiceUrl(workspaceId, id);

    await owner.agent.post(`${url}/send`);

    const tooSoon = await owner.agent.post(`${url}/email`);

    expect(tooSoon.status).toBe(429);
    expect(tooSoon.body.error.code).toBe("INVOICE_EMAILED_RECENTLY");

    await db("invoices")
      .where({ id })
      .update({ last_emailed_at: new Date(Date.now() - 5 * 60 * 1000) });
    sendEmail.mockClear();

    const res = await owner.agent.post(`${url}/email`);

    expect(res.status).toBe(200);
    expect(res.body.emailed).toBe(1);
    expect(res.body.invoice.emailCount).toBe(2);
    expect(sendEmail.mock.calls[0][0].subject).toBe(
      "Reminder: invoice INV-0001 from Invoice Emails",
    );
  });

  it("only emails sent invoices", async () => {
    const { owner, workspaceId, clientId, id } = await setup();
    const voided = await newInvoice(owner, workspaceId, clientId);
    const missing = "00000000-0000-4000-8000-000000000000";

    await owner.agent.post(`${invoiceUrl(workspaceId, voided)}/send`);
    await owner.agent.post(`${invoiceUrl(workspaceId, voided)}/void`);
    sendEmail.mockClear();

    const draft = await owner.agent.post(`${invoiceUrl(workspaceId, id)}/email`);
    const voidRes = await owner.agent.post(`${invoiceUrl(workspaceId, voided)}/email`);
    const none = await owner.agent.post(`${invoiceUrl(workspaceId, missing)}/email`);
    const badId = await owner.agent.post(`${invoiceUrl(workspaceId, "not-a-uuid")}/email`);

    expect(draft.status).toBe(409);
    expect(draft.body.error.code).toBe("INVOICE_NOT_EMAILABLE");
    expect(voidRes.status).toBe(409);
    expect(none.status).toBe(404);
    expect(badId.status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the invoice sent when the email fails, and reports a failed resend", async () => {
    const { owner, workspaceId, id } = await setup();
    const url = invoiceUrl(workspaceId, id);

    sendEmail.mockRejectedValueOnce(new Error("smtp down"));

    const res = await owner.agent.post(`${url}/send`);

    expect(res.status).toBe(200);
    expect(res.body.invoice.status).toBe("sent");
    expect(res.body.emailed).toBe(0);
    expect(res.body.invoice.lastEmailedAt).toBeNull();

    sendEmail.mockRejectedValueOnce(new Error("smtp down"));

    const failed = await owner.agent.post(`${url}/email`);
    const detail = await owner.agent.get(url);

    expect(failed.status).toBe(502);
    expect(failed.body.error.code).toBe("EMAIL_FAILED");
    expect(detail.body.invoice.emailCount).toBe(0);

    const retry = await owner.agent.post(`${url}/email`);

    expect(retry.status).toBe(200);
    expect(retry.body.emailed).toBe(1);
  });

  it("is only for owners and admins in this workspace", async () => {
    const { owner, workspaceId, person, id } = await setup();
    const member = await addMemberTo(workspaceId, "member");
    const outside = await createWorkspace("Outside");
    const url = `${invoiceUrl(workspaceId, id)}/email`;

    await owner.agent.post(`${invoiceUrl(workspaceId, id)}/send`);
    sendEmail.mockClear();

    expect((await member.agent.post(url)).status).toBe(403);
    expect((await person.agent.post(url)).status).toBe(403);
    expect((await outside.owner.agent.post(url)).status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
