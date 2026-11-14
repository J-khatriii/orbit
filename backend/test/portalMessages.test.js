import { describe, expect, it } from "vitest";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}`;
};

const makeClient = async (owner, workspaceId, companyName) => {
  const res = await owner.agent.post(`${base(workspaceId)}/clients`).send({ companyName });

  return res.body.client.id;
};

// Two clients, and a client user who can see the first one only.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace("Portal Chat");
  const clientA = await makeClient(owner, workspaceId, "Alpha Co");
  const clientB = await makeClient(owner, workspaceId, "Beta Co");
  const person = await addMemberTo(workspaceId, "client");

  await owner.agent
    .post(`${base(workspaceId)}/clients/${clientA}/access`)
    .send({ userId: person.res.body.user.id });

  return { owner, workspaceId, clientA, clientB, person };
};

const teamPost = (owner, workspaceId, clientId, body, internal = false) => {
  return owner.agent
    .post(`${base(workspaceId)}/clients/${clientId}/messages`)
    .send({ body, internal });
};

const portalMessages = (workspaceId, clientId) => {
  return `${base(workspaceId)}/portal/clients/${clientId}/messages`;
};

describe("portal messages", () => {
  it("shows the client the team's messages but never internal notes", async () => {
    const { owner, workspaceId, clientA, person } = await setup();

    await teamPost(owner, workspaceId, clientA, "Welcome aboard");
    await teamPost(owner, workspaceId, clientA, "Budget is tight", true);

    const res = await person.agent.get(portalMessages(workspaceId, clientA));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(
      res.body.messages.map((message) => {
        return message.body;
      }),
    ).toEqual(["Welcome aboard"]);
  });

  it("lets a client post, and the team sees it as a normal message", async () => {
    const { owner, workspaceId, clientA, person } = await setup();

    await teamPost(owner, workspaceId, clientA, "Hello from the team");

    const posted = await person.agent
      .post(portalMessages(workspaceId, clientA))
      .send({ body: "  Thanks, looks good!  " });

    expect(posted.status).toBe(201);
    expect(posted.body.message.body).toBe("Thanks, looks good!");
    expect(posted.body.message.mine).toBe(true);

    const clientView = await person.agent.get(portalMessages(workspaceId, clientA));

    expect(
      clientView.body.messages.map((message) => {
        return message.mine;
      }),
    ).toEqual([true, false]);

    const teamView = await owner.agent.get(`${base(workspaceId)}/clients/${clientA}/messages`);
    const latest = teamView.body.messages[0];

    expect(latest.body).toBe("Thanks, looks good!");
    expect(latest.internal).toBe(false);
    expect(latest.author.id).toBe(person.res.body.user.id);
  });

  it("shows nothing about other people's ids or the internal flag", async () => {
    const { owner, workspaceId, clientA, person } = await setup();

    await teamPost(owner, workspaceId, clientA, "Hi");

    const res = await person.agent.get(portalMessages(workspaceId, clientA));

    expect(Object.keys(res.body.messages[0]).sort()).toEqual([
      "authorName",
      "body",
      "createdAt",
      "id",
      "mine",
      "projectName",
    ]);
  });

  it("answers 404 for another client's conversation, reading or posting", async () => {
    const { owner, workspaceId, clientB, person } = await setup();

    await teamPost(owner, workspaceId, clientB, "Private to Beta");

    const read = await person.agent.get(portalMessages(workspaceId, clientB));
    const write = await person.agent
      .post(portalMessages(workspaceId, clientB))
      .send({ body: "Let me in" });

    expect(read.status).toBe(404);
    expect(read.body.error.code).toBe("CLIENT_NOT_FOUND");
    expect(write.status).toBe(404);
  });

  it("lists the clients the person can reach", async () => {
    const { workspaceId, clientA, person } = await setup();
    const stranger = await addMemberTo(workspaceId, "client");

    const mine = await person.agent.get(`${base(workspaceId)}/portal/clients`);
    const none = await stranger.agent.get(`${base(workspaceId)}/portal/clients`);

    expect(mine.body.clients).toEqual([{ id: clientA, name: "Alpha Co" }]);
    expect(none.body.clients).toEqual([]);
  });

  it("rejects an empty message", async () => {
    const { workspaceId, clientA, person } = await setup();

    const res = await person.agent.post(portalMessages(workspaceId, clientA)).send({ body: "  " });

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.body).toBeTruthy();
  });

  it("stops working once access is removed", async () => {
    const { owner, workspaceId, clientA, person } = await setup();

    await owner.agent.delete(
      `${base(workspaceId)}/clients/${clientA}/access/${person.res.body.user.id}`,
    );

    const res = await person.agent.get(portalMessages(workspaceId, clientA));

    expect(res.status).toBe(404);
  });

  it("refuses team roles on the portal routes", async () => {
    const { owner, workspaceId, clientA } = await setup();
    const member = await addMemberTo(workspaceId, "member");

    for (const who of [owner, member]) {
      const res = await who.agent.get(portalMessages(workspaceId, clientA));

      expect(res.status).toBe(403);
    }
  });
});
