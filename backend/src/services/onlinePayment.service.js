import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import { toStripeAmount } from "../lib/stripeAmounts.js";
import * as stripeConnect from "../lib/stripeConnect.js";
import * as invoicesRepository from "../repositories/invoices.repository.js";
import * as stripeAccountsRepository from "../repositories/stripeAccounts.repository.js";
import { AppError } from "../utils/AppError.js";
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
