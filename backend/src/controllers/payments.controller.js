import * as stripeAccountService from "../services/stripeAccount.service.js";

export const getStripeStatus = async (req, res) => {
  const result = await stripeAccountService.getStatus({ workspaceId: req.workspace.id });

  res.json(result);
};

export const connectStripe = async (req, res) => {
  const result = await stripeAccountService.connect({ workspaceId: req.workspace.id });

  res.json(result);
};

export const disconnectStripe = async (req, res) => {
  await stripeAccountService.disconnect({ workspaceId: req.workspace.id });

  res.status(204).end();
};
