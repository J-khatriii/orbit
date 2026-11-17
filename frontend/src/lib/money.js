// How many decimal places this currency has: 2 for USD, 0 for JPY. Unknown codes use 2.
const digitsFor = (currency) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    return 2;
  }
};

// 1250000 cents in GBP -> "£12,500.00"
export const formatMoney = (minor, currency) => {
  const amount = minor / 10 ** digitsFor(currency);

  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digitsFor(currency))}`;
  }
};

// 1250000 cents -> "12500.00", for filling an edit form.
export const minorToInput = (minor, currency) => {
  const digits = digitsFor(currency);

  return (minor / 10 ** digits).toFixed(digits);
};

// "12,500.5" -> { minor: 1250050 }. Blank -> { minor: null }. Bad text -> { error }.
// Done with text, not decimals, so there's never a floating-point rounding error.
export const parseMoney = (text, currency) => {
  const cleaned = text.replace(/[,\s]/g, "");

  if (!cleaned) {
    return { minor: null };
  }
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { error: "Enter an amount like 12500.00" };
  }

  const digits = digitsFor(currency);
  const [whole, fraction = ""] = cleaned.split(".");

  if (fraction.length > digits) {
    return { error: `Use at most ${digits} decimal places` };
  }

  const minor = Number(whole + fraction.padEnd(digits, "0"));

  if (!Number.isSafeInteger(minor) || minor > 1_000_000_000_000) {
    return { error: "That amount is too large" };
  }

  return { minor };
};

// --- Added for invoices ---------------------------------------------------------------
// Quantities are whole thousandths and tax rates are basis points (1800 = 18%). This mirrors
// backend/src/lib/money.js so the preview on screen matches what the server saves. The
// server always has the final say.

export const MAX_AMOUNT_MINOR = 1_000_000_000_000;
export const MAX_QUANTITY_MILLI = 1_000_000_000;

// Like parseMoney, but gives just the number: minor units, or null if blank or not valid.
export const parseMoneyInput = (text, currency) => {
  return parseMoney(text, currency).minor ?? null;
};

// "1.5" -> 1500. Up to 3 decimals, between 0.001 and 1,000,000. Anything else gives null.
export const parseQuantityMilli = (value) => {
  const match = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(String(value).trim());

  if (!match) {
    return null;
  }

  const milli = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));

  return milli >= 1 && milli <= MAX_QUANTITY_MILLI ? milli : null;
};

export const formatQuantity = (milli) => {
  const whole = Math.floor(milli / 1000);
  const fraction = String(milli % 1000)
    .padStart(3, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : String(whole);
};

// "18" -> 1800, "7.5" -> 750. Up to 2 decimals, 0 to 100. Anything else gives null.
export const percentToBps = (text) => {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(String(text).trim().replace(",", "."));

  if (!match) {
    return null;
  }

  const bps = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));

  return bps <= 10000 ? bps : null;
};

export const bpsToPercent = (bps) => {
  const whole = Math.floor(bps / 100);
  const fraction = String(bps % 100)
    .padStart(2, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : String(whole);
};

// numerator / denominator, rounded half up. Both non-negative BigInts.
const roundDivide = (numerator, denominator) => {
  return (numerator * 2n + denominator) / (denominator * 2n);
};

// Returns null if the amount is too large to be valid.
export const lineTotal = (quantityMilli, unitPriceMinor) => {
  const total = Number(roundDivide(BigInt(quantityMilli) * BigInt(unitPriceMinor), 1000n));

  return total <= MAX_AMOUNT_MINOR ? total : null;
};

export const taxAmount = (subtotalMinor, taxRateBps) => {
  return Number(roundDivide(BigInt(subtotalMinor) * BigInt(taxRateBps), 10000n));
};
