import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

const makeClient = async (owner, workspaceId, companyName) => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

// The team uploads a file for a client, shared or not. Returns the file's id.
const addFile = async (owner, workspaceId, clientId, bytes, filename, shared) => {
  const res = await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/files`)
    .field("clientVisible", String(shared))
    .attach("file", bytes, filename);

  return res.body.file.id;
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

// Two clients; the client user can reach only Alpha. Alpha has a shared and a private file,
// Beta has a shared one.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Portal Files");
  const clientA = await makeClient(owner, workspaceId, "Alpha Co");
  const clientB = await makeClient(owner, workspaceId, "Beta Co");
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientA}/access`)
    .send({ userId: person.res.body.user.id });

  const shared = await addFile(owner, workspaceId, clientA, PDF, "brief.pdf", true);
  const priv = await addFile(owner, workspaceId, clientA, PNG, "internal.png", false);
  const other = await addFile(owner, workspaceId, clientB, PDF, "beta.pdf", true);

  return { owner, workspaceId, clientA, clientB, person, shared, priv, other };
};

const portal = (workspaceId) => {
  return `${base(workspaceId)}/portal/files`;
};

describe("portal files", () => {
  it("lists only shared files of clients the person can access", async () => {
    const { workspaceId, person, shared } = await setup();

    const res = await person.agent.get(portal(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(
      res.body.files.map((file) => {
        return file.id;
      }),
    ).toEqual([shared]);
    expect(res.body.files[0].clientName).toBe("Alpha Co");
    expect(res.body.files[0].previewable).toBe(true);
  });

  it("shows nothing internal about a file", async () => {
    const { workspaceId, person } = await setup();

    const res = await person.agent.get(portal(workspaceId));

    expect(Object.keys(res.body.files[0]).sort()).toEqual([
      "clientId",
      "clientName",
      "contentType",
      "createdAt",
      "id",
      "name",
      "previewable",
      "size",
    ]);
  });

  it("downloads a shared file with the same bytes", async () => {
    const { workspaceId, person, shared } = await setup();

    const res = await person.agent
      .get(`${portal(workspaceId)}/${shared}/download`)
      .buffer(true)
      .parse(binary);

    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(Buffer.compare(res.body, PDF)).toBe(0);
  });

  it("answers the same 404 for a private file, another client's file and a missing file", async () => {
    const { workspaceId, person, priv, other } = await setup();
    const missing = "00000000-0000-4000-8000-000000000000";

    for (const id of [priv, other, missing, "not-a-uuid"]) {
      const res = await person.agent.get(`${portal(workspaceId)}/${id}/download`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("FILE_NOT_FOUND");
    }
  });

  it("stops showing a file the moment the team unshares it", async () => {
    const { owner, workspaceId, clientA, person, shared } = await setup();

    await owner.agent
      .patch(`${base(workspaceId)}/clients/${clientA}/files/${shared}`)
      .send({ clientVisible: false });

    const list = await person.agent.get(portal(workspaceId));
    const download = await person.agent.get(`${portal(workspaceId)}/${shared}/download`);

    expect(list.body.files).toEqual([]);
    expect(download.status).toBe(404);
  });

  it("stops showing files once access is removed", async () => {
    const { owner, workspaceId, clientA, person, shared } = await setup();

    await owner.agent.delete(
      `${base(workspaceId)}/clients/${clientA}/access/${person.res.body.user.id}`,
    );

    const list = await person.agent.get(portal(workspaceId));
    const download = await person.agent.get(`${portal(workspaceId)}/${shared}/download`);

    expect(list.body.files).toEqual([]);
    expect(download.status).toBe(404);
  });

  it("hides the files of an archived client", async () => {
    const { workspaceId, clientA, person, shared } = await setup();

    await db("clients").where({ id: clientA }).update({ archived_at: db.fn.now() });

    const list = await person.agent.get(portal(workspaceId));
    const download = await person.agent.get(`${portal(workspaceId)}/${shared}/download`);

    expect(list.body.files).toEqual([]);
    expect(download.status).toBe(404);
  });

  it("answers 404 once the team deletes the file", async () => {
    const { owner, workspaceId, clientA, person, shared } = await setup();

    await owner.agent.delete(`${base(workspaceId)}/clients/${clientA}/files/${shared}`);

    const download = await person.agent.get(`${portal(workspaceId)}/${shared}/download`);

    expect(download.status).toBe(404);
  });

  it("can't be widened with a client filter", async () => {
    const { workspaceId, clientA, clientB, person } = await setup();

    const own = await person.agent.get(`${portal(workspaceId)}?clientId=${clientA}`);
    const foreign = await person.agent.get(`${portal(workspaceId)}?clientId=${clientB}`);

    expect(own.body.total).toBe(1);
    expect(foreign.status).toBe(200);
    expect(foreign.body.files).toEqual([]);
  });

  it("shows nothing to a client user with no access, and refuses team roles and outsiders", async () => {
    const { owner, workspaceId, shared } = await setup();
    const stranger = await addMemberTo(workspaceId, "client");
    const member = await addMemberTo(workspaceId, "member");
    const outsider = await createWorkspace("Outside");

    const empty = await stranger.agent.get(portal(workspaceId));
    const blocked = await stranger.agent.get(`${portal(workspaceId)}/${shared}/download`);

    expect(empty.status).toBe(200);
    expect(empty.body.files).toEqual([]);
    expect(blocked.status).toBe(404);
    expect((await owner.agent.get(portal(workspaceId))).status).toBe(403);
    expect((await member.agent.get(portal(workspaceId))).status).toBe(403);
    expect((await outsider.owner.agent.get(portal(workspaceId))).status).toBe(404);
  });
});
