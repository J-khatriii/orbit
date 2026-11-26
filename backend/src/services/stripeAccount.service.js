import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import { logger } from "../lib/logger.js";
import * as stripeConnect from "../lib/stripeConnect.js";
import * as stripeAccountsRepository from "../repositories/stripeAccounts.repository.js";
import { AppError } from "../utils/AppError.js";

const settingsUrl = (state) => {
  return `${env.APP_URL}/settings/payments?stripe=${state}`;
};

const present = (row, extra = {}) => {
  return {
    connected: Boolean(row),
    chargesEnabled: row?.charges_enabled ?? false,
    detailsSubmitted: row?.details_submitted ?? false,
    country: row?.country ?? null,
    statusCheckFailed: false,
    ...extra,
  };
};

// Asks Stripe where the account stands and saves any change. If Stripe can't be reached, or
// the agency removed Orbit's access, the saved values are shown instead of an error, so the
// owner can still open the page and disconnect.
const refresh = async (row) => {
  try {
    const live = await stripeConnect.retrieveAccount(row.stripe_account_id);
    const changed =
      live.chargesEnabled !== row.charges_enabled ||
      live.detailsSubmitted !== row.details_submitted ||
      live.country !== row.country;

    if (!changed) {
      return { row, failed: false };
    }

    const values = {
      charges_enabled: live.chargesEnabled,
      details_submitted: live.detailsSubmitted,
      country: live.country,
    };

    await stripeAccountsRepository.update(db, {
      workspaceId: row.workspace_id,
      livemode: row.livemode,
      values,
    });

    return { row: { ...row, ...values }, failed: false };
  } catch (error) {
    logger.warn({ err: error, workspaceId: row.workspace_id }, "stripe status check failed");

    return { row, failed: true };
  }
};

export const getStatus = async ({ workspaceId }) => {
  const configured = stripeConnect.isConfigured();
  const livemode = stripeConnect.LIVEMODE;
  const row = configured
    ? await stripeAccountsRepository.find(db, { workspaceId, livemode })
    : undefined;

  if (!row) {
    return { configured, livemode, ...present(undefined) };
  }

  const result = await refresh(row);

  return { configured, livemode, ...present(result.row, { statusCheckFailed: result.failed }) };
};

// Creates the workspace's Stripe account the first time, then returns a fresh link to
// Stripe's hosted onboarding. Also used to continue onboarding after "Save for later".
export const connect = async ({ workspaceId }) => {
  if (!stripeConnect.isConfigured()) {
    throw new AppError(
      503,
      "PAYMENTS_NOT_CONFIGURED",
      "Online payments aren't set up on this server yet",
    );
  }

  const livemode = stripeConnect.LIVEMODE;

  const accountId = await db.transaction(async (trx) => {
    await stripeAccountsRepository.lockWorkspace(trx, { workspaceId });

    const existing = await stripeAccountsRepository.find(trx, { workspaceId, livemode });

    if (existing?.charges_enabled) {
      throw new AppError(409, "ALREADY_CONNECTED", "Stripe is already connected and ready");
    }
    if (existing) {
      return existing.stripe_account_id;
    }

    const account = await stripeConnect.createConnectedAccount({ workspaceId });

    await stripeAccountsRepository.insert(trx, {
      workspace_id: workspaceId,
      livemode,
      stripe_account_id: account.accountId,
      charges_enabled: account.chargesEnabled,
      details_submitted: account.detailsSubmitted,
      country: account.country,
    });

    return account.accountId;
  });

  const url = await stripeConnect.createOnboardingLink({
    accountId,
    returnUrl: settingsUrl("return"),
    refreshUrl: settingsUrl("refresh"),
  });

  return { url };
};

// Only unlinks the account inside Orbit. The agency's Stripe account itself is untouched.
export const disconnect = async ({ workspaceId }) => {
  await stripeAccountsRepository.remove(db, { workspaceId, livemode: stripeConnect.LIVEMODE });
};
