import { describe, expect, it } from "vitest";
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
const CSV = Buffer.from("name,price\nLogo,100\n");
// "MZ" starts every Windows program. Anything claiming to be a picture but starting like this
// is not a picture.
const EXE = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200, 1)]);

const makeClient = async (owner, workspaceId, companyName = "Alpha Co") => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

const filesUrl = (workspaceId, clientId) => {
  return `${base(workspaceId)}/clients/${clientId}/files`;
};

const upload = (agent, workspaceId, clientId, bytes, filename, fields = {}) => {
  let request = agent.post(filesUrl(workspaceId, clientId)).attach("file", bytes, filename);

  for (const [name, value] of Object.entries(fields)) {
    request = request.field(name, value);
  }

  return request;
};

// Collects a response as raw bytes, whatever its type.
const binary = (res, callback) => {
  const chunks = [];

  res.on("data", (chunk) => {
    chunks.push(chunk);
  });
  res.on("end", () => {
    callback(null, Buffer.concat(chunks));
  });
};

const download = (agent, url) => {
  return agent.get(url).buffer(true).parse(binary);
};

describe("files", () => {
  it("uploads a picture, lists it and downloads exactly the same bytes", async () => {
    const { owner, workspaceId } = await createWorkspace("File Studio");
    const clientId = await makeClient(owner, workspaceId);

    const res = await upload(owner.agent, workspaceId, clientId, PNG, "logo.png");

    expect(res.status).toBe(201);
    expect(res.body.file.name).toBe("logo.png");
    expect(res.body.file.contentType).toBe("image/png");
    expect(res.body.file.size).toBe(PNG.length);
    expect(res.body.file.clientVisible).toBe(false);
    expect(res.body.file).not.toHaveProperty("storageKey");
    expect(res.body.file).not.toHaveProperty("storage_key");

    const list = await owner.agent.get(filesUrl(workspaceId, clientId));

    expect(list.body.total).toBe(1);
    expect(list.body.files[0].id).toBe(res.body.file.id);

    const file = await download(
      owner.agent,
      `${filesUrl(workspaceId, clientId)}/${res.body.file.id}/download`,
    );

    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toContain("image/png");
    expect(file.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(Buffer.compare(file.body, PNG)).toBe(0);
  });

  it("shows only pictures and PDFs inline", async () => {
    const { owner, workspaceId } = await createWorkspace("Inline");
    const clientId = await makeClient(owner, workspaceId);
    const png = await upload(owner.agent, workspaceId, clientId, PNG, "logo.png");
    const csv = await upload(owner.agent, workspaceId, clientId, CSV, "prices.csv");
    const url = (id) => {
      return `${filesUrl(workspaceId, clientId)}/${id}/download?inline=1`;
    };

    const pngRes = await download(owner.agent, url(png.body.file.id));
    const csvRes = await download(owner.agent, url(csv.body.file.id));

    expect(pngRes.headers["content-disposition"]).toMatch(/^inline;/);
    expect(csvRes.headers["content-disposition"]).toMatch(/^attachment;/);
  });

  it("refuses a program renamed to look like a picture", async () => {
    const { owner, workspaceId } = await createWorkspace("Disguise");
    const clientId = await makeClient(owner, workspaceId);

    const res = await upload(owner.agent, workspaceId, clientId, EXE, "totally-a-logo.png");
    const list = await owner.agent.get(filesUrl(workspaceId, clientId));

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(list.body.total).toBe(0);
  });

  it("refuses SVG, which can carry scripts", async () => {
    const { owner, workspaceId } = await createWorkspace("No SVG");
    const clientId = await makeClient(owner, workspaceId);
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    const res = await upload(owner.agent, workspaceId, clientId, svg, "icon.svg");

    expect(res.status).toBe(415);
  });

  it("accepts text and CSV, but not binary content in a text file", async () => {
    const { owner, workspaceId } = await createWorkspace("Text");
    const clientId = await makeClient(owner, workspaceId);

    const csv = await upload(owner.agent, workspaceId, clientId, CSV, "prices.csv");
    const fake = await upload(
      owner.agent,
      workspaceId,
      clientId,
      Buffer.from([65, 0, 66, 0, 67]),
      "notes.txt",
    );

    expect(csv.status).toBe(201);
    expect(csv.body.file.contentType).toBe("text/csv");
    expect(fake.status).toBe(415);
  });

  it("refuses an empty file", async () => {
    const { owner, workspaceId } = await createWorkspace("Empty");
    const clientId = await makeClient(owner, workspaceId);

    const res = await upload(owner.agent, workspaceId, clientId, Buffer.alloc(0), "empty.txt");

    expect(res.status).toBe(400);
  });

  it("refuses a file over the size limit", async () => {
    const { owner, workspaceId } = await createWorkspace("Too Big");
    const clientId = await makeClient(owner, workspaceId);
    const big = Buffer.concat([PDF, Buffer.alloc(26 * 1024 * 1024)]);

    const res = await upload(owner.agent, workspaceId, clientId, big, "huge.pdf");

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("keeps clients and outsiders away", async () => {
    const { owner, workspaceId } = await createWorkspace("Locked");
    const clientId = await makeClient(owner, workspaceId);
    const made = await upload(owner.agent, workspaceId, clientId, PDF, "brief.pdf");
    const person = await addMemberTo(workspaceId, "client");
    const other = await createWorkspace("Outside");
    const url = filesUrl(workspaceId, clientId);

    expect((await person.agent.get(url)).status).toBe(403);
    expect((await upload(person.agent, workspaceId, clientId, PDF, "x.pdf")).status).toBe(403);
    expect((await person.agent.get(`${url}/${made.body.file.id}/download`)).status).toBe(403);
    expect((await other.owner.agent.get(url)).status).toBe(404);
  });

  it("only tags a file with one of this client's projects", async () => {
    const { owner, workspaceId } = await createWorkspace("Projects");
    const clientId = await makeClient(owner, workspaceId);
    const otherClientId = await makeClient(owner, workspaceId, "Other Co");
    const projectRes = await owner.agent
      .post(`${base(workspaceId)}/projects`)
      .send({ clientId: otherClientId, name: "Their site" });

    const res = await upload(owner.agent, workspaceId, clientId, PDF, "brief.pdf", {
      projectId: projectRes.body.project.id,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.projectId).toBeTruthy();
  });

  it("renames and shares a file", async () => {
    const { owner, workspaceId } = await createWorkspace("Share");
    const clientId = await makeClient(owner, workspaceId);
    const made = await upload(owner.agent, workspaceId, clientId, PDF, "brief.pdf");
    const url = `${filesUrl(workspaceId, clientId)}/${made.body.file.id}`;

    const res = await owner.agent.patch(url).send({ name: "Final brief.pdf", clientVisible: true });
    const empty = await owner.agent.patch(url).send({});

    expect(res.status).toBe(200);
    expect(res.body.file.name).toBe("Final brief.pdf");
    expect(res.body.file.clientVisible).toBe(true);
    expect(empty.status).toBe(400);
  });

  it("deletes a file for owners only, and it can't be downloaded afterwards", async () => {
    const { owner, workspaceId } = await createWorkspace("Delete");
    const clientId = await makeClient(owner, workspaceId);
    const made = await upload(owner.agent, workspaceId, clientId, PDF, "brief.pdf");
    const url = `${filesUrl(workspaceId, clientId)}/${made.body.file.id}`;
    const member = await addMemberTo(workspaceId, "member");

    const refused = await member.agent.delete(url);
    const deleted = await owner.agent.delete(url);
    const gone = await owner.agent.get(`${url}/download`);

    expect(refused.status).toBe(403);
    expect(deleted.status).toBe(204);
    expect(gone.status).toBe(404);
    expect(gone.body.error.code).toBe("FILE_NOT_FOUND");
  });

  it("doesn't find a file under the wrong client", async () => {
    const { owner, workspaceId } = await createWorkspace("Wrong Client");
    const clientId = await makeClient(owner, workspaceId);
    const otherClientId = await makeClient(owner, workspaceId, "Other Co");
    const made = await upload(owner.agent, workspaceId, clientId, PDF, "brief.pdf");

    const res = await owner.agent.get(
      `${filesUrl(workspaceId, otherClientId)}/${made.body.file.id}/download`,
    );

    expect(res.status).toBe(404);
  });
});
