import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import { logger } from "../lib/logger.js";
import { fromStripeAmount, toStripeAmount } from "../lib/stripeAmounts.js";
import * as stripeConnect from "../lib/stripeConnect.js";
import * as invoicesRepository from "../repositories/invoices.repository.js";
import * as stripeAccountsRepository from "../repositories/stripeAccounts.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import * as invoiceService from "./invoice.service.js";
import { toPortalInvoice } from "./serializers.js";

const balanceOf = (invoice) => {
  return invoice.total_minor - invoice.amount_paid_minor;
};

// The workspace's Stripe account, if it is ready to take payments.
const readyAccount = async (workspaceId) => {
  if (!stripeConnect.isConfigured()) {
    return undefined;
  }

  const account = await stripeAccountsRepository.find(db, {
    workspaceId,
    livemode: stripeConnect.LIVEMODE,
  });

  return account?.charges_enabled ? account : undefined;
};

const unavailable = () => {
  return new AppError(
    409,
    "ONLINE_PAYMENTS_UNAVAILABLE",
    "Online payment isn't available for this invoice. Ask the sender how to pay.",
  );
};

// `invoice` is a row as the portal repository returns it.
export const canPayOnline = async ({ workspaceId, invoice }) => {
  const balance = balanceOf(invoice);

  if (invoice.status !== "sent" || balance <= 0) {
    return false;
  }
  if (toStripeAmount(balance, invoice.currency) === null) {
    return false;
  }

  return Boolean(await readyAccount(workspaceId));
};

// Starts a Checkout for what is still owed and returns the page to send the client to.
export const createCheckout = async ({ workspaceId, invoice }) => {
  const balance = balanceOf(invoice);

  if (invoice.status !== "sent" || balance <= 0) {
    throw new AppError(409, "INVOICE_NOT_PAYABLE", "This invoice can't be paid online");
  }

  const account = await readyAccount(workspaceId);
  const amount = toStripeAmount(balance, invoice.currency);

  if (!account || amount === null) {
    throw unavailable();
  }

  const workspace = await invoicesRepository.findWorkspace(db, { workspaceId });
  const url = await stripeConnect.createCheckoutSession({
    accountId: account.stripe_account_id,
    workspaceId,
    invoiceId: invoice.id,
    label: toPortalInvoice(invoice).label,
    workspaceName: workspace.name,
    currency: invoice.currency,
    amount,
    successUrl: `${env.APP_URL}/portal/invoices/${invoice.id}?payment=success`,
    cancelUrl: `${env.APP_URL}/portal/invoices/${invoice.id}?payment=cancelled`,
  });

  return { url };
};

const PAID_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const ignore = (reason, details) => {
  logger.warn(details, `stripe event ignored: ${reason}`);
};

// Turns a verified Stripe event into a recorded payment. Events we don't use, and anything
// that doesn't add up, are logged and answered with success, so Stripe doesn't retry them.
// A real failure (such as the database being down) throws, so Stripe does retry.
export const handleStripeEvent = async (event) => {
  if (Boolean(event.livemode) !== stripeConnect.LIVEMODE) {
    ignore("wrong mode", { eventId: event.id });

    return;
  }
  if (event.type === "checkout.session.async_payment_failed") {
    logger.info({ eventId: event.id }, "a delayed online payment failed");

    return;
  }
  if (!PAID_EVENTS.has(event.type)) {
    return;
  }

  const session = event.data.object;

  // A delayed payment method (such as a bank debit) completes the Checkout before the money
  // arrives. The "async payment succeeded" event comes later.
  if (session.payment_status !== "paid") {
    return;
  }

  const workspaceId = session.metadata?.orbit_workspace_id;
  const invoiceId = session.metadata?.orbit_invoice_id;

  if (!isUuid(workspaceId) || !isUuid(invoiceId)) {
    ignore("not an Orbit payment", { eventId: event.id });

    return;
  }

  // Events from every connected agency arrive here. Only the account stored for this
  // workspace may credit its invoices, whatever the metadata says.
  const account = await stripeAccountsRepository.find(db, {
    workspaceId,
    livemode: Boolean(event.livemode),
  });

  if (!account || event.account !== account.stripe_account_id) {
    ignore("account does not belong to the workspace", { eventId: event.id, workspaceId });

    return;
  }

  const invoice = await invoicesRepository.findById(db, { workspaceId, id: invoiceId });

  if (!invoice || String(session.currency).toUpperCase() !== invoice.currency) {
    ignore("invoice or currency does not match", { eventId: event.id, workspaceId, invoiceId });

    return;
  }

  const amountMinor = fromStripeAmount(session.amount_total, invoice.currency);

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    ignore("amount is not usable", { eventId: event.id, workspaceId, invoiceId });

    return;
  }

  const externalId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  await invoiceService.recordOnlinePayment({
    workspaceId,
    invoiceId,
    amountMinor,
    externalId,
    paidOn: new Date(event.created * 1000).toISOString().slice(0, 10),
  });
};
