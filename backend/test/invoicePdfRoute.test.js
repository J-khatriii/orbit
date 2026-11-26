import { describe, expect, it } from "vitest";
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

// An owner with one client and one draft invoice.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("PDF Studio");
  const clientRes = await owner.agent
    .post(`${base(workspaceId)}/clients`)
    .send({ companyName: "Alpha Co" });
  const invoiceRes = await owner.agent.post(`${base(workspaceId)}/invoices`).send({
    clientId: clientRes.body.client.id,
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2026-12-16",
    taxRateBps: 1800,
    items: [{ description: "Design", quantity: "2", unitPriceMinor: 5000 }],
  });

  return { owner, workspaceId, invoiceId: invoiceRes.body.invoice.id };
};

const pdfUrl = (workspaceId, invoiceId) => {
  return `${base(workspaceId)}/invoices/${invoiceId}/pdf`;
};

describe("invoice PDF route", () => {
  it("downloads a sent invoice as a PDF named after its number", async () => {
    const { owner, workspaceId, invoiceId } = await setup();

    await owner.agent.post(`${base(workspaceId)}/invoices/${invoiceId}/send`);

    const res = await owner.agent.get(pdfUrl(workspaceId, invoiceId)).buffer(true).parse(binary);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="INV-0001.pdf"');
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.body.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("makes a PDF of a draft too, without a number in its name", async () => {
    const { owner, workspaceId, invoiceId } = await setup();

    const res = await owner.agent.get(pdfUrl(workspaceId, invoiceId)).buffer(true).parse(binary);

    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(
      /^attachment; filename="draft-[0-9a-f]{8}\.pdf"$/,
    );
  });

  it("opens in the browser when asked to", async () => {
    const { owner, workspaceId, invoiceId } = await setup();

    const res = await owner.agent
      .get(`${pdfUrl(workspaceId, invoiceId)}?inline=1`)
      .buffer(true)
      .parse(binary);

    expect(res.headers["content-disposition"]).toMatch(/^inline;/);
  });

  it("is for owners and admins only, and stays inside its workspace", async () => {
    const { workspaceId, invoiceId } = await setup();
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");
    const person = await addMemberTo(workspaceId, "client");
    const other = await createWorkspace("Other Studio");

    expect((await admin.agent.get(pdfUrl(workspaceId, invoiceId))).status).toBe(200);
    expect((await member.agent.get(pdfUrl(workspaceId, invoiceId))).status).toBe(403);
    expect((await person.agent.get(pdfUrl(workspaceId, invoiceId))).status).toBe(403);
    expect((await other.owner.agent.get(pdfUrl(workspaceId, invoiceId))).status).toBe(404);
    expect((await other.owner.agent.get(pdfUrl(other.workspaceId, invoiceId))).status).toBe(404);
    expect((await admin.agent.get(pdfUrl(workspaceId, "not-a-uuid"))).status).toBe(404);
  });
});
