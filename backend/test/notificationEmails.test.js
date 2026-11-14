import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/mailer.js", () => {
  return {
    sendEmail: vi.fn(async () => {
      return {};
    }),
  };
});

import { db } from "../src/db/knex.js";
import { sendEmail } from "../src/lib/mailer.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const settle = () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 300);
  });
};

// The emails sent to one address that are about notifications (not sign-up or invitations).
const mailsTo = (email) => {
  return sendEmail.mock.calls
    .map((call) => {
      return call[0];
    })
    .filter((mail) => {
      return mail.to === email && /sent you a message|review is needed/i.test(mail.subject);
    });
};

const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Mail Studio");
  const clientRes = await owner.agent
    .post(`${base(workspaceId)}/clients`)
    .send({ companyName: "Alpha Co" });
  const clientId = clientRes.body.client.id;
  const projectRes = await owner.agent
    .post(`${base(workspaceId)}/projects`)
    .send({ clientId, name: "Alpha site" });
  const projectId = projectRes.body.project.id;
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/access`)
    .send({ userId: person.res.body.user.id });

  return { owner, workspaceId, clientId, projectId, person, email: person.res.body.user.email };
};

describe("notification emails", () => {
  beforeEach(() => {
    sendEmail.mockClear();
  });

  it("emails a client about a team message, once until they've read it", async () => {
    const { owner, workspaceId, clientId, person, email } = await setup();
    const url = `${base(workspaceId)}/clients/${clientId}/messages`;

    await owner.agent.post(url).send({ body: "First" });
    await vi.waitFor(() => {
      expect(mailsTo(email)).toHaveLength(1);
    });

    await owner.agent.post(url).send({ body: "Second, while the first is unread" });
    await settle();
    expect(mailsTo(email)).toHaveLength(1);

    await person.agent.post(`${base(workspaceId)}/notifications/read`).send({ all: true });
    await owner.agent.post(url).send({ body: "Third, after they've read" });
    await vi.waitFor(() => {
      expect(mailsTo(email)).toHaveLength(2);
    });

    const mail = mailsTo(email)[0];

    expect(mail.html).toContain("/portal/messages");
    expect(mail.html).not.toContain("First");
  });

  it("does not email about internal notes", async () => {
    const { owner, workspaceId, clientId, email } = await setup();

    await owner.agent
      .post(`${base(workspaceId)}/clients/${clientId}/messages`)
      .send({ body: "Budget is tight", internal: true });
    await settle();

    expect(mailsTo(email)).toHaveLength(0);
  });

  it("emails a client when a shared task goes In review", async () => {
    const { owner, workspaceId, projectId, email } = await setup();
    const [task] = await db("tasks")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: "Homepage design",
        status: "in_progress",
        client_visible: true,
        position: 1000,
      })
      .returning("id");

    await owner.agent
      .post(`${base(workspaceId)}/projects/${projectId}/tasks/${task.id}/move`)
      .send({ status: "in_review", afterTaskId: null });

    await vi.waitFor(() => {
      expect(mailsTo(email)).toHaveLength(1);
    });

    const mail = mailsTo(email)[0];

    expect(mail.subject).toContain("Homepage design");
    expect(mail.html).toContain(`/portal/projects/${projectId}`);
  });

  it("does not email the team when a client writes", async () => {
    const { workspaceId, clientId, person } = await setup();

    sendEmail.mockClear();
    await person.agent
      .post(`${base(workspaceId)}/portal/clients/${clientId}/messages`)
      .send({ body: "Looks good" });
    await settle();

    expect(
      sendEmail.mock.calls.filter((call) => {
        return /sent you a message|review is needed/i.test(call[0].subject);
      }),
    ).toHaveLength(0);
  });
});
