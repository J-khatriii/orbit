// Stripe's amounts differ from ours in a few currencies. Ours are whole minor units from the
// currency's own decimals (Intl), so for most currencies they are the same number.
const THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);
// Stripe treats these as two-decimal currencies even though they have no cents.
const SCALED_BY_100 = new Set(["ISK", "UGX"]);

// Our minor units -> the number Stripe wants. null means Stripe can't take this amount.
export const toStripeAmount = (minor, currency) => {
  if (THREE_DECIMAL.has(currency) && minor % 10 !== 0) {
    return null;
  }

  return SCALED_BY_100.has(currency) ? minor * 100 : minor;
};

export const fromStripeAmount = (amount, currency) => {
  return SCALED_BY_100.has(currency) ? amount / 100 : amount;
};
