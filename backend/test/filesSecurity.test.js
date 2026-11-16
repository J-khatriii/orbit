import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { storage } from "../src/lib/storage.js";
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

const filesUrl = (workspaceId, clientId) => {
  return `${base(workspaceId)}/clients/${clientId}/files`;
};

// An owner, a client with a shared PDF, and a client user who can reach that client's portal.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("File Security");
  const clientId = await makeClient(owner, workspaceId, "Alpha Co");
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/access`)
    .send({ userId: person.res.body.user.id });

  const uploaded = await owner.agent
    .post(filesUrl(workspaceId, clientId))
    .field("clientVisible", "true")
    .attach("file", PDF, "brief.pdf");

  return { owner, workspaceId, clientId, person, fileId: uploaded.body.file.id };
};

// Every team file route, as one person would try them.
const teamRequests = (agent, workspaceId, clientId, fileId) => {
  const url = filesUrl(workspaceId, clientId);

  return [
    agent.get(url),
    agent.post(url).attach("file", PDF, "x.pdf"),
    agent.get(`${url}/${fileId}/download`),
    agent.patch(`${url}/${fileId}`).send({ name: "Renamed.pdf" }),
    agent.delete(`${url}/${fileId}`),
  ];
};

const statusesOf = async (requests) => {
  const responses = await Promise.all(requests);

  return responses.map((res) => {
    return res.status;
  });
};

describe("file security", () => {
  it("keeps clients, suspended members and outsiders out of every team file route", async () => {
    const { workspaceId, clientId, person, fileId } = await setup();
    const suspended = await addMemberTo(workspaceId, "member", "suspended");
    const outsider = await createWorkspace("Outside");

    expect(await statusesOf(teamRequests(person.agent, workspaceId, clientId, fileId))).toEqual([
      403, 403, 403, 403, 403,
    ]);
    expect(await statusesOf(teamRequests(suspended.agent, workspaceId, clientId, fileId))).toEqual([
      404, 404, 404, 404, 404,
    ]);
    expect(
      await statusesOf(teamRequests(outsider.owner.agent, workspaceId, clientId, fileId)),
    ).toEqual([404, 404, 404, 404, 404]);
  });

  it("tells the browser not to guess the type of a download", async () => {
    const { owner, workspaceId, clientId, person, fileId } = await setup();

    const team = await owner.agent
      .get(`${filesUrl(workspaceId, clientId)}/${fileId}/download`)
      .buffer(true)
      .parse(binary);
    const portal = await person.agent
      .get(`${base(workspaceId)}/portal/files/${fileId}/download`)
      .buffer(true)
      .parse(binary);

    expect(team.headers["x-content-type-options"]).toBe("nosniff");
    expect(portal.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("keeps a non-English file name intact and the download header well-formed", async () => {
    const { owner, workspaceId, clientId } = await setup();

    const uploaded = await owner.agent
      .post(filesUrl(workspaceId, clientId))
      .attach("file", PDF, "résumé final.pdf");
    const download = await owner.agent
      .get(`${filesUrl(workspaceId, clientId)}/${uploaded.body.file.id}/download`)
      .buffer(true)
      .parse(binary);
    const header = download.headers["content-disposition"];

    expect(uploaded.body.file.name).toBe("résumé final.pdf");
    expect(header).toContain('filename="r_sum_ final.pdf"');
    expect(header).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9%20final.pdf");
  });

  it("never reveals where a file is stored", async () => {
    const { owner, workspaceId, clientId, person } = await setup();

    const sent = await owner.agent
      .post(`${base(workspaceId)}/clients/${clientId}/messages`)
      .field("body", "A picture")
      .attach("files", PNG, "pic.png");
    const responses = [
      sent,
      await owner.agent.get(filesUrl(workspaceId, clientId)),
      await owner.agent.get(`${base(workspaceId)}/clients/${clientId}/messages`),
      await person.agent.get(`${base(workspaceId)}/portal/files`),
      await person.agent.get(`${base(workspaceId)}/portal/clients/${clientId}/messages`),
    ];

    for (const res of responses) {
      const text = JSON.stringify(res.body);

      expect(res.status).toBeLessThan(300);
      expect(text).not.toMatch(/storage/i);
      expect(text).not.toContain(`${workspaceId}/`);
    }
  });

  it("doesn't let another workspace reach a file through its own workspace", async () => {
    const { workspaceId, clientId, fileId } = await setup();
    const other = await createWorkspace("Other Studio");
    const otherClient = await makeClient(other.owner, other.workspaceId, "Other Co");

    const wrongClient = await other.owner.agent.get(
      `${filesUrl(other.workspaceId, clientId)}/${fileId}/download`,
    );
    const wrongFile = await other.owner.agent.get(
      `${filesUrl(other.workspaceId, otherClient)}/${fileId}/download`,
    );
    const theirWorkspace = await other.owner.agent.get(filesUrl(workspaceId, clientId));

    expect(wrongClient.status).toBe(404);
    expect(wrongFile.status).toBe(404);
    expect(wrongFile.body.error.code).toBe("FILE_NOT_FOUND");
    expect(theirWorkspace.status).toBe(404);
  });

  it("refuses a client's attachment for a client they can't reach, and stores nothing", async () => {
    const { owner, workspaceId, person } = await setup();
    const hidden = await makeClient(owner, workspaceId, "Beta Co");

    const res = await person.agent
      .post(`${base(workspaceId)}/portal/clients/${hidden}/messages`)
      .field("body", "Sneaky")
      .attach("files", PDF, "x.pdf");
    const files = await owner.agent.get(filesUrl(workspaceId, hidden));
    const messages = await owner.agent.get(`${base(workspaceId)}/clients/${hidden}/messages`);

    expect(res.status).toBe(404);
    expect(files.body.total).toBe(0);
    expect(messages.body.total).toBe(0);
  });

  it("removes the stored bytes when a file is deleted", async () => {
    const { owner, workspaceId, clientId, fileId } = await setup();
    const row = await db("files").where({ id: fileId }).first();
    const before = storage.get(row.storage_key);

    await once(before, "open");
    before.destroy();

    const deleted = await owner.agent.delete(`${filesUrl(workspaceId, clientId)}/${fileId}`);
    const after = storage.get(row.storage_key);

    expect(deleted.status).toBe(204);
    await expect(once(after, "open")).rejects.toThrow();
    expect(await db("files").where({ id: fileId }).first()).toBeUndefined();
  });

  it("refuses a client-role user sending files through the team's message route", async () => {
    const { owner, workspaceId, clientId, person } = await setup();

    const res = await person.agent
      .post(`${base(workspaceId)}/clients/${clientId}/messages`)
      .field("body", "Hello")
      .attach("files", PDF, "x.pdf");
    const files = await owner.agent.get(filesUrl(workspaceId, clientId));

    expect(res.status).toBe(403);
    // Only the PDF the setup uploaded.
    expect(files.body.total).toBe(1);
  });
});
