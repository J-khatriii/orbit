import * as stripeConnect from "../lib/stripeConnect.js";
import * as onlinePaymentService from "../services/onlinePayment.service.js";

export const handleStripeWebhook = async (req, res) => {
  const event = stripeConnect.verifyWebhook(req.body, req.headers["stripe-signature"]);

  await onlinePaymentService.handleStripeEvent(event);

  res.json({ received: true });
};
