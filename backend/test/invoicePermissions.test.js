import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";
const FAKE = "00000000-0000-4000-8000-000000000000";

const INVOICE_ROUTES = [
  ["get", "/invoices"],
  ["post", "/invoices"],
  ["get", `/invoices/${FAKE}`],
  ["patch", `/invoices/${FAKE}`],
  ["delete", `/invoices/${FAKE}`],
  ["post", `/invoices/${FAKE}/send`],
  ["post", `/invoices/${FAKE}/void`],
  ["post", `/invoices/${FAKE}/email`],
  ["get", `/invoices/${FAKE}/pdf`],
  ["post", `/invoices/${FAKE}/payments`],
  ["delete", `/invoices/${FAKE}/payments/${FAKE}`],
];

const SETTINGS_ROUTES = [
  ["get", "/payments/stripe"],
  ["post", "/payments/stripe/connect"],
  ["delete", "/payments/stripe"],
];

// Calls every route as the given agent and returns the statuses, so a failure says which
// route let the wrong person in.
const statuses = async (caller, workspaceId, routes) => {
  const results = [];

  for (const [method, path] of routes) {
    const res = await caller[method](`${WS}/${workspaceId}${path}`).send({});

    results.push(`${method.toUpperCase()} ${path} -> ${res.status}`);
  }

  return results;
};

const expectAll = (results, expected) => {
  const wanted = results.map((line) => {
    return `${line.slice(0, line.lastIndexOf(" ") + 1)}${expected}`;
  });

  expect(results).toEqual(wanted);
};

describe("invoice and payment settings permissions", () => {
  it("rejects everyone who is not signed in", async () => {
    const { workspaceId } = await createWorkspace("Signed Out Studio");
    const results = await statuses(request(app), workspaceId, [
      ...INVOICE_ROUTES,
      ...SETTINGS_ROUTES,
    ]);

    expectAll(results, 401);
  });

  it("keeps out people from another workspace", async () => {
    const { workspaceId } = await createWorkspace("Target Studio");
    const outsider = await createWorkspace("Outsider Studio");
    const results = await statuses(outsider.owner.agent, workspaceId, [
      ...INVOICE_ROUTES,
      ...SETTINGS_ROUTES,
    ]);

    for (const line of results) {
      expect(["403", "404"]).toContain(line.slice(line.lastIndexOf(" ") + 1));
    }
  });

  it("lets only owners and admins reach the invoice routes", async () => {
    const { owner, workspaceId } = await createWorkspace("Invoice Roles Studio");
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");
    const client = await addMemberTo(workspaceId, "client");

    expectAll(await statuses(member.agent, workspaceId, INVOICE_ROUTES), 403);
    expectAll(await statuses(client.agent, workspaceId, INVOICE_ROUTES), 403);

    for (const person of [owner, admin]) {
      const results = await statuses(person.agent, workspaceId, INVOICE_ROUTES);

      for (const line of results) {
        expect(["401", "403"]).not.toContain(line.slice(line.lastIndexOf(" ") + 1));
      }
    }
  });

  it("lets only the owner reach the Stripe settings", async () => {
    const { owner, workspaceId } = await createWorkspace("Settings Roles Studio");

    for (const role of ["admin", "member", "client"]) {
      const person = await addMemberTo(workspaceId, role);

      expectAll(await statuses(person.agent, workspaceId, SETTINGS_ROUTES), 403);
    }

    const status = await owner.agent.get(`${WS}/${workspaceId}/payments/stripe`);
    const disconnect = await owner.agent.delete(`${WS}/${workspaceId}/payments/stripe`);

    expect(status.status).toBe(200);
    expect(status.body.connected).toBe(false);
    expect(disconnect.status).toBe(204);
  });
});
