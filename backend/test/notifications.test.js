import { describe, expect, it } from "vitest";
import { db } from "../src/db/knex.js";
import { notify } from "../src/services/notification.service.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const base = (workspaceId) => {
  return `${WS}/${workspaceId}/notifications`;
};

const idOf = (person) => {
  return person.res.body.user.id;
};

const send = async (workspaceId, userIds, data = {}, extra = {}) => {
  await notify(db, { workspaceId, userIds, kind: "message", data, ...extra });
};

describe("notifications", () => {
  it("lists only my notifications, newest first, with the unread count", async () => {
    const { workspaceId } = await createWorkspace("Notify Studio");
    const me = await addMemberTo(workspaceId, "member");
    const other = await addMemberTo(workspaceId, "member");

    await send(workspaceId, [idOf(me)], { n: 1 });
    await send(workspaceId, [idOf(me)], { n: 2 });
    await send(workspaceId, [idOf(other)], { n: 3 });

    const res = await me.agent.get(base(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.unread).toBe(2);
    expect(
      res.body.notifications.map((notification) => {
        return notification.data.n;
      }),
    ).toEqual([2, 1]);
    expect(res.body.notifications[0].read).toBe(false);
  });

  it("answers the unread count", async () => {
    const { workspaceId } = await createWorkspace("Badge");
    const me = await addMemberTo(workspaceId, "member");

    await send(workspaceId, [idOf(me)]);
    await send(workspaceId, [idOf(me)]);

    const res = await me.agent.get(`${base(workspaceId)}/unread-count`);

    expect(res.status).toBe(200);
    expect(res.body.unread).toBe(2);
  });

  it("marks chosen notifications as read", async () => {
    const { workspaceId } = await createWorkspace("Read Some");
    const me = await addMemberTo(workspaceId, "member");

    await send(workspaceId, [idOf(me)], { n: 1 });
    await send(workspaceId, [idOf(me)], { n: 2 });

    const list = await me.agent.get(base(workspaceId));
    const newest = list.body.notifications[0].id;

    const res = await me.agent.post(`${base(workspaceId)}/read`).send({ ids: [newest] });
    const after = await me.agent.get(base(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(1);
    expect(res.body.unread).toBe(1);
    expect(after.body.notifications[0].read).toBe(true);
    expect(after.body.notifications[1].read).toBe(false);
  });

  it("marks everything as read", async () => {
    const { workspaceId } = await createWorkspace("Read All");
    const me = await addMemberTo(workspaceId, "member");

    await send(workspaceId, [idOf(me)]);
    await send(workspaceId, [idOf(me)]);

    const res = await me.agent.post(`${base(workspaceId)}/read`).send({ all: true });

    expect(res.body.updated).toBe(2);
    expect(res.body.unread).toBe(0);
  });

  it("leaves other people's notifications alone", async () => {
    const { workspaceId } = await createWorkspace("Not Yours");
    const me = await addMemberTo(workspaceId, "member");
    const other = await addMemberTo(workspaceId, "member");

    await send(workspaceId, [idOf(other)]);

    const theirs = await other.agent.get(base(workspaceId));
    const res = await me.agent
      .post(`${base(workspaceId)}/read`)
      .send({ ids: [theirs.body.notifications[0].id] });
    const check = await other.agent.get(`${base(workspaceId)}/unread-count`);

    expect(res.body.updated).toBe(0);
    expect(check.body.unread).toBe(1);
  });

  it("filters to unread", async () => {
    const { workspaceId } = await createWorkspace("Unread Only");
    const me = await addMemberTo(workspaceId, "member");

    await send(workspaceId, [idOf(me)], { n: 1 });
    await send(workspaceId, [idOf(me)], { n: 2 });
    await me.agent.post(`${base(workspaceId)}/read`).send({ all: true });
    await send(workspaceId, [idOf(me)], { n: 3 });

    const res = await me.agent.get(`${base(workspaceId)}?view=unread`);

    expect(res.body.total).toBe(1);
    expect(res.body.notifications[0].data.n).toBe(3);
  });

  it("never notifies the person who caused it, and only once per person", async () => {
    const { workspaceId } = await createWorkspace("No Echo");
    const actor = await addMemberTo(workspaceId, "member");
    const other = await addMemberTo(workspaceId, "member");

    await send(workspaceId, [idOf(actor), idOf(other), idOf(other)], {}, { actorId: idOf(actor) });

    const mine = await actor.agent.get(`${base(workspaceId)}/unread-count`);
    const theirs = await other.agent.get(`${base(workspaceId)}/unread-count`);

    expect(mine.body.unread).toBe(0);
    expect(theirs.body.unread).toBe(1);
  });

  it("hides the workspace from outsiders and rejects an empty read request", async () => {
    const { workspaceId } = await createWorkspace("Inside");
    const me = await addMemberTo(workspaceId, "member");
    const other = await createWorkspace("Outside");

    const outsider = await other.owner.agent.get(base(workspaceId));
    const empty = await me.agent.post(`${base(workspaceId)}/read`).send({});

    expect(outsider.status).toBe(404);
    expect(empty.status).toBe(400);
  });
});
