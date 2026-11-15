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
const EXE = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200, 1)]);

// An owner, one client, and a client user who can reach that client's portal.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Attach Studio");
  const res = await owner.agent
    .post(`${base(workspaceId)}/clients`)
    .send({ companyName: "Alpha Co" });
  const clientId = res.body.client.id;
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/access`)
    .send({ userId: person.res.body.user.id });

  return { owner, workspaceId, clientId, person };
};

const teamUrl = (workspaceId, clientId) => {
  return `${base(workspaceId)}/clients/${clientId}/messages`;
};

const portalUrl = (workspaceId, clientId) => {
  return `${base(workspaceId)}/portal/clients/${clientId}/messages`;
};

const filesUrl = (workspaceId, clientId) => {
  return `${base(workspaceId)}/clients/${clientId}/files`;
};

// Adds files (a list of [bytes, name]) to a request, in the "files" field.
const withFiles = (request, files) => {
  let result = request;

  for (const [bytes, name] of files) {
    result = result.attach("files", bytes, name);
  }

  return result;
};

describe("message attachments", () => {
  it("sends files with a team message, shared with the client", async () => {
    const { owner, workspaceId, clientId, person } = await setup();

    const res = await withFiles(
      owner.agent.post(teamUrl(workspaceId, clientId)).field("body", "Here are the files"),
      [
        [PNG, "logo.png"],
        [PDF, "brief.pdf"],
      ],
    );

    expect(res.status).toBe(201);
    expect(res.body.message.internal).toBe(false);
    expect(res.body.message.attachments).toHaveLength(2);
    expect(
      res.body.message.attachments.every((file) => {
        return file.clientVisible;
      }),
    ).toBe(true);

    const list = await owner.agent.get(teamUrl(workspaceId, clientId));
    const seen = await person.agent.get(portalUrl(workspaceId, clientId));
    const first = seen.body.messages[0].attachments[0];
    const download = await person.agent.get(
      `${base(workspaceId)}/portal/files/${first.id}/download`,
    );
    const filesTab = await owner.agent.get(filesUrl(workspaceId, clientId));

    expect(list.body.messages[0].attachments).toHaveLength(2);
    expect(seen.body.messages[0].attachments).toHaveLength(2);
    expect(Object.keys(first).sort()).toEqual(["contentType", "id", "name", "previewable", "size"]);
    expect(download.status).toBe(200);
    expect(filesTab.body.total).toBe(2);
  });

  it("keeps files on an internal note private", async () => {
    const { owner, workspaceId, clientId, person } = await setup();

    const res = await withFiles(
      owner.agent
        .post(teamUrl(workspaceId, clientId))
        .field("body", "Budget notes")
        .field("internal", "true"),
      [[PDF, "budget.pdf"]],
    );
    const fileId = res.body.message.attachments[0].id;

    const seen = await person.agent.get(portalUrl(workspaceId, clientId));
    const download = await person.agent.get(`${base(workspaceId)}/portal/files/${fileId}/download`);

    expect(res.status).toBe(201);
    expect(res.body.message.attachments[0].clientVisible).toBe(false);
    expect(seen.body.messages).toEqual([]);
    expect(download.status).toBe(404);
  });

  it("refuses a disguised program and creates no message", async () => {
    const { owner, workspaceId, clientId } = await setup();

    const res = await withFiles(
      owner.agent.post(teamUrl(workspaceId, clientId)).field("body", "Look at this"),
      [
        [PNG, "fine.png"],
        [EXE, "logo.png"],
      ],
    );
    const messages = await owner.agent.get(teamUrl(workspaceId, clientId));
    const files = await owner.agent.get(filesUrl(workspaceId, clientId));

    expect(res.status).toBe(415);
    expect(messages.body.total).toBe(0);
    expect(files.body.total).toBe(0);
  });

  it("refuses more than five files", async () => {
    const { owner, workspaceId, clientId } = await setup();
    const six = Array.from({ length: 6 }, (unused, index) => {
      return [PNG, `pic-${index}.png`];
    });

    const res = await withFiles(
      owner.agent.post(teamUrl(workspaceId, clientId)).field("body", "Too many"),
      six,
    );
    const messages = await owner.agent.get(teamUrl(workspaceId, clientId));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPLOAD_INVALID");
    expect(messages.body.total).toBe(0);
  });

  it("still needs some text, and stores nothing without it", async () => {
    const { owner, workspaceId, clientId } = await setup();

    const res = await withFiles(owner.agent.post(teamUrl(workspaceId, clientId)), [
      [PDF, "brief.pdf"],
    ]);
    const files = await owner.agent.get(filesUrl(workspaceId, clientId));

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.body).toBeTruthy();
    expect(files.body.total).toBe(0);
  });

  it("lets a client attach files, visible to them and to the team", async () => {
    const { owner, workspaceId, clientId, person } = await setup();

    const res = await withFiles(
      person.agent.post(portalUrl(workspaceId, clientId)).field("body", "Our logo"),
      [[PNG, "our-logo.png"]],
    );
    const team = await owner.agent.get(teamUrl(workspaceId, clientId));
    const files = await owner.agent.get(filesUrl(workspaceId, clientId));

    expect(res.status).toBe(201);
    expect(res.body.message.attachments[0].previewable).toBe(true);
    expect(team.body.messages[0].attachments[0].clientVisible).toBe(true);
    expect(files.body.files[0].uploadedBy.id).toBe(person.res.body.user.id);
  });

  it("hides an attachment from the client once the team unshares it", async () => {
    const { owner, workspaceId, clientId, person } = await setup();
    const sent = await withFiles(
      owner.agent.post(teamUrl(workspaceId, clientId)).field("body", "Contract"),
      [[PDF, "contract.pdf"]],
    );
    const fileId = sent.body.message.attachments[0].id;

    await owner.agent
      .patch(`${filesUrl(workspaceId, clientId)}/${fileId}`)
      .send({ clientVisible: false });

    const seen = await person.agent.get(portalUrl(workspaceId, clientId));

    expect(seen.body.messages).toHaveLength(1);
    expect(seen.body.messages[0].attachments).toEqual([]);
  });

  it("refuses a disguised program from a client and creates no message", async () => {
    const { owner, workspaceId, clientId, person } = await setup();

    const res = await withFiles(
      person.agent.post(portalUrl(workspaceId, clientId)).field("body", "Here you go"),
      [[EXE, "logo.png"]],
    );
    const messages = await owner.agent.get(teamUrl(workspaceId, clientId));

    expect(res.status).toBe(415);
    expect(messages.body.total).toBe(0);
  });

  it("gives a text-only message an empty attachment list", async () => {
    const { owner, workspaceId, clientId } = await setup();

    const res = await owner.agent.post(teamUrl(workspaceId, clientId)).send({ body: "Hi" });

    expect(res.status).toBe(201);
    expect(res.body.message.attachments).toEqual([]);
  });
});
