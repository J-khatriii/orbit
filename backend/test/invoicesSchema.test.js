import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const setup = async (name) => {
  const { owner, workspaceId } = await createWorkspace(name);
  const res = await owner.agent
    .post(`${WS}/${workspaceId}/clients`)
    .send({ companyName: "Alpha Co" });

  return { workspaceId, clientId: res.body.client.id };
};

const draft = (workspaceId, clientId, overrides = {}) => {
  return {
    workspace_id: workspaceId,
    client_id: clientId,
    currency: "USD",
    issue_date: "2026-11-16",
    due_date: "2026-12-16",
    ...overrides,
  };
};

const sent = (workspaceId, clientId, overrides = {}) => {
  return draft(workspaceId, clientId, {
    status: "sent",
    number: 1,
    sent_at: new Date(),
    subtotal_minor: 1000,
    tax_minor: 180,
    total_minor: 1180,
    ...overrides,
  });
};

// Runs a query and returns the database error, or null if it worked.
const attempt = async (query) => {
  try {
    await query;
    return null;
  } catch (error) {
    return error;
  }
};

describe("invoice tables", () => {
  it("stores a draft with no number and zero totals", async () => {
    const { workspaceId, clientId } = await setup("Schema A");

    const [row] = await db("invoices").insert(draft(workspaceId, clientId)).returning("*");

    expect(row.status).toBe("draft");
    expect(row.number).toBeNull();
    expect(Number(row.total_minor)).toBe(0);
  });

  it("keeps numbers and statuses consistent", async () => {
    const { workspaceId, clientId } = await setup("Schema B");

    const numberedDraft = await attempt(
      db("invoices").insert(draft(workspaceId, clientId, { number: 5 })),
    );
    const unnumberedSent = await attempt(
      db("invoices").insert(sent(workspaceId, clientId, { number: null })),
    );

    expect(numberedDraft?.constraint).toBe("invoices_number_status_check");
    expect(unnumberedSent?.constraint).toBe("invoices_number_status_check");
  });

  it("refuses a total that isn't subtotal plus tax", async () => {
    const { workspaceId, clientId } = await setup("Schema C");

    const error = await attempt(
      db("invoices").insert(sent(workspaceId, clientId, { total_minor: 1000 })),
    );

    expect(error?.constraint).toBe("invoices_total_check");
  });

  it("refuses a due date before the issue date", async () => {
    const { workspaceId, clientId } = await setup("Schema D");

    const error = await attempt(
      db("invoices").insert(draft(workspaceId, clientId, { due_date: "2026-11-01" })),
    );

    expect(error?.constraint).toBe("invoices_dates_check");
  });

  it("refuses a client from another workspace", async () => {
    const a = await setup("Schema E1");
    const b = await setup("Schema E2");

    const error = await attempt(db("invoices").insert(draft(b.workspaceId, a.clientId)));

    expect(error?.code).toBe("23503");
  });

  it("deletes the lines with their invoice and refuses a repeated position", async () => {
    const { workspaceId, clientId } = await setup("Schema F");
    const [invoice] = await db("invoices").insert(draft(workspaceId, clientId)).returning("id");
    const line = {
      workspace_id: workspaceId,
      invoice_id: invoice.id,
      position: 1,
      description: "Design",
      quantity_milli: 1000,
      unit_price_minor: 5000,
      line_total_minor: 5000,
    };

    await db("invoice_items").insert(line);
    const repeated = await attempt(db("invoice_items").insert(line));

    await db("invoices").where({ id: invoice.id }).del();
    const left = await db("invoice_items").where({ invoice_id: invoice.id });

    expect(repeated?.code).toBe("23505");
    expect(left).toEqual([]);
  });

  it("numbers invoices once per workspace", async () => {
    const a = await setup("Schema G1");
    const b = await setup("Schema G2");

    await db("invoices").insert(sent(a.workspaceId, a.clientId));
    const repeated = await attempt(db("invoices").insert(sent(a.workspaceId, a.clientId)));
    const otherWorkspace = await attempt(db("invoices").insert(sent(b.workspaceId, b.clientId)));

    expect(repeated?.constraint).toBe("invoices_number_unique");
    expect(otherWorkspace).toBeNull();
  });

  it("refuses to delete a client that has invoices", async () => {
    const { workspaceId, clientId } = await setup("Schema H");

    await db("invoices").insert(draft(workspaceId, clientId));
    const error = await attempt(db("clients").where({ id: clientId }).del());

    expect(error?.code).toBe("23503");
  });
});
