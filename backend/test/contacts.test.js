import { describe, expect, it } from "vitest";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WORKSPACES = "/api/v1/workspaces";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const clientsUrl = (workspaceId) => {
  return `${WORKSPACES}/${workspaceId}/clients`;
};

const contactsUrl = (workspaceId, clientId) => {
  return `${clientsUrl(workspaceId)}/${clientId}/contacts`;
};

// A workspace with an owner and one client, ready for contacts.
const setup = async () => {
  const { owner, workspaceId } = await createWorkspace();
  const client = await owner.agent
    .post(clientsUrl(workspaceId))
    .send({ companyName: "Northwind Studio" });
  const clientId = client.body.client.id;

  return { owner, workspaceId, clientId, url: contactsUrl(workspaceId, clientId) };
};

const addContact = async (agent, url, body = {}) => {
  return agent.post(url).send({ name: "Priya Raman", ...body });
};

const namesOf = (res) => {
  return res.body.contacts.map((contact) => {
    return contact.name;
  });
};

const primariesOf = (res) => {
  return res.body.contacts
    .filter((contact) => {
      return contact.isPrimary;
    })
    .map((contact) => {
      return contact.name;
    });
};

const feedOf = async (agent, workspaceId, clientId) => {
  const res = await agent.get(`${clientsUrl(workspaceId)}/${clientId}/activity`);

  return res.body.activity;
};

describe("adding contacts", () => {
  it("makes the first contact primary and saves clean values", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const res = await addContact(owner.agent, url, {
      email: "Priya@BrightLabs.test",
      phone: "",
      jobTitle: "  Head of Marketing ",
    });

    expect(res.status).toBe(201);
    expect(res.body.contact).toMatchObject({
      clientId,
      name: "Priya Raman",
      email: "priya@brightlabs.test",
      phone: null,
      jobTitle: "Head of Marketing",
      isPrimary: true,
    });

    const feed = await feedOf(owner.agent, workspaceId, clientId);

    expect(feed[0]).toMatchObject({
      action: "contact.created",
      entityType: "contact",
      clientId,
      metadata: { name: "Priya Raman", isPrimary: true },
    });
  });

  it("keeps exactly one primary when a later contact asks to be primary", async () => {
    const { owner, url } = await setup();

    await addContact(owner.agent, url, { name: "First" });

    const second = await addContact(owner.agent, url, { name: "Second" });
    const third = await addContact(owner.agent, url, { name: "Third", isPrimary: true });

    expect(second.body.contact.isPrimary).toBe(false);
    expect(third.body.contact.isPrimary).toBe(true);
    expect(primariesOf(await owner.agent.get(url))).toEqual(["Third"]);
  });

  it("rejects bad input with a message for each field", async () => {
    const { owner, url } = await setup();
    const empty = await owner.agent.post(url).send({});
    const badEmail = await addContact(owner.agent, url, { email: "nope" });
    const unknown = await addContact(owner.agent, url, { userId: MISSING_ID });

    expect(empty.status).toBe(400);
    expect(empty.body.error.details.fields.name).toBeDefined();
    expect(badEmail.body.error.details.fields.email).toBeDefined();
    expect(unknown.status).toBe(400);
  });

  it("answers 404 when the client doesn't exist", async () => {
    const { owner, workspaceId } = await setup();

    for (const id of [MISSING_ID, "not-a-uuid"]) {
      const list = await owner.agent.get(contactsUrl(workspaceId, id));
      const create = await addContact(owner.agent, contactsUrl(workspaceId, id));

      expect(list.status).toBe(404);
      expect(list.body.error.code).toBe("CLIENT_NOT_FOUND");
      expect(create.status).toBe(404);
    }
  });
});

describe("listing contacts", () => {
  it("lists the primary first, then everyone else by name", async () => {
    const { owner, url } = await setup();

    await addContact(owner.agent, url, { name: "Zed" });
    await addContact(owner.agent, url, { name: "Bob" });
    await addContact(owner.agent, url, { name: "Amy" });

    expect(namesOf(await owner.agent.get(url))).toEqual(["Zed", "Amy", "Bob"]);
  });
});

describe("editing contacts", () => {
  it("changes only what was sent and turns blanks into nothing", async () => {
    const { owner, url } = await setup();
    const created = await addContact(owner.agent, url, { email: "priya@brightlabs.test" });
    const contactUrl = `${url}/${created.body.contact.id}`;
    const res = await owner.agent
      .patch(contactUrl)
      .send({ jobTitle: "CEO", phone: "+91 98765 43210", email: "" });

    expect(res.status).toBe(200);
    expect(res.body.contact).toMatchObject({
      name: "Priya Raman",
      jobTitle: "CEO",
      phone: "+91 98765 43210",
      email: null,
    });
    expect((await owner.agent.patch(contactUrl).send({})).status).toBe(400);
  });

  it("hands the primary role over when another contact is made primary", async () => {
    const { owner, url } = await setup();

    await addContact(owner.agent, url, { name: "A" });

    const b = await addContact(owner.agent, url, { name: "B" });
    const res = await owner.agent.patch(`${url}/${b.body.contact.id}`).send({ isPrimary: true });

    expect(res.status).toBe(200);
    expect(primariesOf(await owner.agent.get(url))).toEqual(["B"]);
  });

  it("won't un-primary the primary contact directly", async () => {
    const { owner, url } = await setup();
    const a = await addContact(owner.agent, url, { name: "A" });
    const b = await addContact(owner.agent, url, { name: "B" });
    const refused = await owner.agent
      .patch(`${url}/${a.body.contact.id}`)
      .send({ isPrimary: false });
    const harmless = await owner.agent
      .patch(`${url}/${b.body.contact.id}`)
      .send({ isPrimary: false });

    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("PRIMARY_REQUIRED");
    expect(harmless.status).toBe(200);
    expect(primariesOf(await owner.agent.get(url))).toEqual(["A"]);
  });

  it("answers 404 for unknown contacts, and for contacts of a different client", async () => {
    const { owner, workspaceId, url } = await setup();
    const other = await owner.agent.post(clientsUrl(workspaceId)).send({ companyName: "Other Co" });
    const otherUrl = contactsUrl(workspaceId, other.body.client.id);
    const mine = await addContact(owner.agent, url);

    for (const id of [MISSING_ID, "not-a-uuid"]) {
      const edit = await owner.agent.patch(`${url}/${id}`).send({ phone: "1" });
      const remove = await owner.agent.delete(`${url}/${id}`);

      expect(edit.status).toBe(404);
      expect(edit.body.error.code).toBe("CONTACT_NOT_FOUND");
      expect(remove.status).toBe(404);
    }

    // The right id, but under the wrong client.
    const wrongClient = await owner.agent
      .patch(`${otherUrl}/${mine.body.contact.id}`)
      .send({ phone: "1" });

    expect(wrongClient.status).toBe(404);
  });

  it("records which fields changed in the client's history, never their values", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const created = await addContact(owner.agent, url);

    await owner.agent
      .patch(`${url}/${created.body.contact.id}`)
      .send({ phone: "555-0100", jobTitle: "CTO" });

    const feed = await feedOf(owner.agent, workspaceId, clientId);

    expect(feed[0].action).toBe("contact.updated");
    expect(feed[0].metadata.fields.sort()).toEqual(["jobTitle", "phone"]);
    expect(JSON.stringify(feed[0].metadata)).not.toContain("555-0100");
  });
});

describe("removing contacts", () => {
  it("removes a contact that isn't primary", async () => {
    const { owner, url } = await setup();

    await addContact(owner.agent, url, { name: "A" });

    const b = await addContact(owner.agent, url, { name: "B" });

    await addContact(owner.agent, url, { name: "C" });

    const res = await owner.agent.delete(`${url}/${b.body.contact.id}`);

    expect(res.status).toBe(204);
    expect(namesOf(await owner.agent.get(url))).toEqual(["A", "C"]);
  });

  it("promotes the oldest remaining contact when the primary is removed", async () => {
    const { owner, url } = await setup();
    const a = await addContact(owner.agent, url, { name: "A" });

    await addContact(owner.agent, url, { name: "B" });
    await addContact(owner.agent, url, { name: "C" });
    await owner.agent.delete(`${url}/${a.body.contact.id}`);

    expect(primariesOf(await owner.agent.get(url))).toEqual(["B"]);
  });

  it("can remove the last contact, and records it", async () => {
    const { owner, workspaceId, clientId, url } = await setup();
    const only = await addContact(owner.agent, url);

    await owner.agent.delete(`${url}/${only.body.contact.id}`);

    expect(namesOf(await owner.agent.get(url))).toEqual([]);

    const feed = await feedOf(owner.agent, workspaceId, clientId);

    expect(feed[0]).toMatchObject({ action: "contact.deleted", metadata: { name: "Priya Raman" } });
  });
});

const RULES = [
  {
    action: "list contacts",
    allowed: ["owner", "admin", "member"],
    successStatus: 200,
    call: (agent, url) => {
      return agent.get(url);
    },
  },
  {
    action: "add a contact",
    allowed: ["owner", "admin", "member"],
    successStatus: 201,
    call: (agent, url) => {
      return agent.post(url).send({ name: "Made By Role" });
    },
  },
  {
    action: "remove a contact",
    allowed: ["owner", "admin", "member"],
    successStatus: 204,
    call: (agent, url, contactId) => {
      return agent.delete(`${url}/${contactId}`);
    },
  },
];

describe("who can do what with contacts", () => {
  for (const rule of RULES) {
    for (const role of ["owner", "admin", "member", "client"]) {
      const allowed = rule.allowed.includes(role);

      it(`${role} ${allowed ? "can" : "cannot"} ${rule.action}`, async () => {
        const { owner, workspaceId, url } = await setup();
        const user = role === "owner" ? owner : await addMemberTo(workspaceId, role);
        const existing = await addContact(owner.agent, url, { name: "Existing" });
        const res = await rule.call(user.agent, url, existing.body.contact.id);

        expect(res.status).toBe(allowed ? rule.successStatus : 403);
        expect(res.body.error?.code).toBe(allowed ? undefined : "FORBIDDEN");
      });
    }
  }
});

describe("keeping workspaces apart", () => {
  it("never lets one workspace reach another's contacts", async () => {
    const alpha = await createWorkspace("Alpha");
    const beta = await setup();
    const contact = await addContact(beta.owner.agent, beta.url);
    const contactId = contact.body.contact.id;
    const viaAlpha = contactsUrl(alpha.workspaceId, beta.clientId);

    expect((await alpha.owner.agent.get(viaAlpha)).status).toBe(404);
    expect((await addContact(alpha.owner.agent, viaAlpha)).status).toBe(404);
    expect(
      (await alpha.owner.agent.patch(`${viaAlpha}/${contactId}`).send({ phone: "1" })).status,
    ).toBe(404);
    expect((await alpha.owner.agent.delete(`${viaAlpha}/${contactId}`)).status).toBe(404);

    // Going through the other workspace's own address is refused too.
    expect((await alpha.owner.agent.get(beta.url)).status).toBe(404);

    const check = await beta.owner.agent.get(beta.url);

    expect(namesOf(check)).toEqual(["Priya Raman"]);
  });
});
