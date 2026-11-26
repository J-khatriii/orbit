import Stripe from "stripe";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "./logger.js";

export const isConfigured = () => {
  return Boolean(env.STRIPE_SECRET_KEY);
};

// A sandbox key starts with sk_test_, a real one with sk_live_.
export const LIVEMODE = /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY ?? "");

let client = null;

const stripe = () => {
  if (!isConfigured()) {
    throw new AppError(
      503,
      "PAYMENTS_NOT_CONFIGURED",
      "Online payments aren't set up on this server yet",
    );
  }

  client ??= new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20000 });

  return client;
};

// Stripe's own error text is logged, never sent to the browser.
const callStripe = async (action) => {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error({ err: error }, "stripe request failed");
    throw new AppError(
      502,
      "STRIPE_ERROR",
      "Stripe couldn't complete that. Try again in a moment.",
    );
  }
};

const toStatus = (account) => {
  return {
    accountId: account.id,
    chargesEnabled: Boolean(account.charges_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    country: account.country ?? null,
  };
};

// A Standard account: the agency keeps its own Stripe Dashboard and handles its own refunds.
export const createConnectedAccount = async ({ workspaceId }) => {
  return callStripe(async () => {
    const account = await stripe().accounts.create({
      type: "standard",
      metadata: { orbit_workspace_id: workspaceId },
    });

    return toStatus(account);
  });
};

export const retrieveAccount = async (accountId) => {
  return callStripe(async () => {
    return toStatus(await stripe().accounts.retrieve(accountId));
  });
};

// A single-use link to Stripe's hosted onboarding page.
export const createOnboardingLink = async ({ accountId, returnUrl, refreshUrl }) => {
  return callStripe(async () => {
    const link = await stripe().accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });

    return link.url;
  });
};

// A hosted Checkout page for one invoice, charged directly on the agency's own account.
// It expires after an hour. Returns the page's URL.
export const createCheckoutSession = async ({
  accountId,
  workspaceId,
  invoiceId,
  label,
  workspaceName,
  currency,
  amount,
  successUrl,
  cancelUrl,
}) => {
  const metadata = { orbit_workspace_id: workspaceId, orbit_invoice_id: invoiceId };

  return callStripe(async () => {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: amount,
              product_data: { name: `Invoice ${label} from ${workspaceName}` },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: invoiceId,
        metadata,
        payment_intent_data: { metadata, description: `Invoice ${label}` },
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { stripeAccount: accountId },
    );

    return session.url;
  });
};

// Checks that a webhook really came from Stripe. `rawBody` must be the exact bytes Stripe
// sent, so the route that calls this must not run the JSON parser first.
export const verifyWebhook = (rawBody, signature) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(
      503,
      "PAYMENTS_NOT_CONFIGURED",
      "Online payments aren't set up on this server yet",
    );
  }

  try {
    return stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError(400, "INVALID_SIGNATURE", "Invalid signature");
  }
};
