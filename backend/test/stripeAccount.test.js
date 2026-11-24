import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/stripeConnect.js", () => {
  const unique = () => {
    return `acct_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
  };

  return {
    LIVEMODE: false,
    isConfigured: vi.fn(() => {
      return true;
    }),
    createConnectedAccount: vi.fn(async () => {
      return { accountId: unique(), chargesEnabled: false, detailsSubmitted: false, country: "IN" };
    }),
    createOnboardingLink: vi.fn(async ({ accountId }) => {
      return `https://connect.stripe.test/onboard/${accountId}`;
    }),
    retrieveAccount: vi.fn(async (accountId) => {
      return { accountId, chargesEnabled: false, detailsSubmitted: false, country: "IN" };
    }),
  };
});

import { db } from "../src/db/knex.js";
import * as stripeConnect from "../src/lib/stripeConnect.js";
import { addMemberTo, createWorkspace } from "./helpers.js";

const WS = "/api/v1/workspaces";

const stripeUrl = (workspaceId, suffix = "") => {
  return `${WS}/${workspaceId}/payments/stripe${suffix}`;
};

describe("stripe account", () => {
  beforeEach(() => {
    stripeConnect.isConfigured.mockReturnValue(true);
    stripeConnect.createConnectedAccount.mockClear();
    stripeConnect.createOnboardingLink.mockClear();
  });

  it("starts disconnected", async () => {
    const { owner, workspaceId } = await createWorkspace("Not Connected");

    const res = await owner.agent.get(stripeUrl(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      configured: true,
      livemode: false,
      connected: false,
      chargesEnabled: false,
    });
  });

  it("creates the account once and returns an onboarding link every time", async () => {
    const { owner, workspaceId } = await createWorkspace("Connect Once");

    const first = await owner.agent.post(stripeUrl(workspaceId, "/connect"));
    const second = await owner.agent.post(stripeUrl(workspaceId, "/connect"));
    const rows = await db("stripe_accounts").where({ workspace_id: workspaceId });

    expect(first.status).toBe(200);
    expect(first.body.url).toContain("https://connect.stripe.test/onboard/acct_");
    expect(second.body.url).toBe(first.body.url);
    expect(stripeConnect.createConnectedAccount).toHaveBeenCalledTimes(1);
    expect(stripeConnect.createOnboardingLink).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(1);
    expect(rows[0].livemode).toBe(false);

    const status = await owner.agent.get(stripeUrl(workspaceId));

    expect(status.body.connected).toBe(true);
    expect(status.body.chargesEnabled).toBe(false);
    expect(status.body.country).toBe("IN");
  });

  it("can't create two accounts when connect is clicked twice at once", async () => {
    const { owner, workspaceId } = await createWorkspace("Double Click");

    const results = await Promise.all([
      owner.agent.post(stripeUrl(workspaceId, "/connect")),
      owner.agent.post(stripeUrl(workspaceId, "/connect")),
    ]);

    expect(results[0].status).toBe(200);
    expect(results[1].status).toBe(200);
    expect(stripeConnect.createConnectedAccount).toHaveBeenCalledTimes(1);
  });

  it("saves what Stripe reports, and stops offering onboarding once it is ready", async () => {
    const { owner, workspaceId } = await createWorkspace("Becomes Ready");

    await owner.agent.post(stripeUrl(workspaceId, "/connect"));
    stripeConnect.retrieveAccount.mockResolvedValueOnce({
      accountId: "acct_whatever",
      chargesEnabled: true,
      detailsSubmitted: true,
      country: "IN",
    });

    const status = await owner.agent.get(stripeUrl(workspaceId));
    const row = await db("stripe_accounts").where({ workspace_id: workspaceId }).first();
    const again = await owner.agent.post(stripeUrl(workspaceId, "/connect"));

    expect(status.body.chargesEnabled).toBe(true);
    expect(status.body.detailsSubmitted).toBe(true);
    expect(row.charges_enabled).toBe(true);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ALREADY_CONNECTED");
  });

  it("still shows the saved status when Stripe can't be reached", async () => {
    const { owner, workspaceId } = await createWorkspace("Stripe Down");

    await owner.agent.post(stripeUrl(workspaceId, "/connect"));
    stripeConnect.retrieveAccount.mockRejectedValueOnce(new Error("network down"));

    const res = await owner.agent.get(stripeUrl(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.statusCheckFailed).toBe(true);
  });

  it("disconnects, and can connect again with a new account", async () => {
    const { owner, workspaceId } = await createWorkspace("Disconnect");

    await owner.agent.post(stripeUrl(workspaceId, "/connect"));

    const removed = await owner.agent.delete(stripeUrl(workspaceId));
    const removedAgain = await owner.agent.delete(stripeUrl(workspaceId));
    const status = await owner.agent.get(stripeUrl(workspaceId));

    expect(removed.status).toBe(204);
    expect(removedAgain.status).toBe(204);
    expect(status.body.connected).toBe(false);

    const reconnect = await owner.agent.post(stripeUrl(workspaceId, "/connect"));

    expect(reconnect.status).toBe(200);
    expect(stripeConnect.createConnectedAccount).toHaveBeenCalledTimes(2);
  });

  it("is owners only, and stays inside its workspace", async () => {
    const { workspaceId } = await createWorkspace("Owner Only");
    const admin = await addMemberTo(workspaceId, "admin");
    const member = await addMemberTo(workspaceId, "member");
    const person = await addMemberTo(workspaceId, "client");
    const outside = await createWorkspace("Outside");

    for (const user of [admin, member, person]) {
      expect((await user.agent.get(stripeUrl(workspaceId))).status).toBe(403);
      expect((await user.agent.post(stripeUrl(workspaceId, "/connect"))).status).toBe(403);
      expect((await user.agent.delete(stripeUrl(workspaceId))).status).toBe(403);
    }

    expect((await outside.owner.agent.get(stripeUrl(workspaceId))).status).toBe(404);
    expect((await outside.owner.agent.post(stripeUrl(workspaceId, "/connect"))).status).toBe(404);
    expect(stripeConnect.createConnectedAccount).not.toHaveBeenCalled();
  });

  it("explains when online payments aren't set up on the server", async () => {
    const { owner, workspaceId } = await createWorkspace("Not Configured");

    stripeConnect.isConfigured.mockReturnValue(false);

    const status = await owner.agent.get(stripeUrl(workspaceId));
    const connect = await owner.agent.post(stripeUrl(workspaceId, "/connect"));

    expect(status.body.configured).toBe(false);
    expect(status.body.connected).toBe(false);
    expect(connect.status).toBe(503);
    expect(connect.body.error.code).toBe("PAYMENTS_NOT_CONFIGURED");
    expect(stripeConnect.createConnectedAccount).not.toHaveBeenCalled();
  });
});
