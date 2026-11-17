// Money is whole numbers of the currency's smallest unit ("minor units": cents for USD, yen
// for JPY). Quantities are whole thousandths. Tax rates are basis points (1800 = 18%).
// Everything here is exact integer arithmetic, so there is no floating-point drift.

// The biggest line total or unit price we accept. Keeps every sum safely inside what a
// JavaScript number can hold exactly, even with 100 lines.
export const MAX_AMOUNT_MINOR = 1_000_000_000_000;
export const MAX_QUANTITY_MILLI = 1_000_000_000;

const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

// How many decimal places the currency's major unit has.
export const exponentOf = (currency) => {
  if (ZERO_DECIMAL.has(currency)) {
    return 0;
  }

  return THREE_DECIMAL.has(currency) ? 3 : 2;
};

// numerator / denominator, rounded half up. Both must be non-negative BigInts.
const roundDivide = (numerator, denominator) => {
  return (numerator * 2n + denominator) / (denominator * 2n);
};

const assertAmount = (value, what) => {
  if (value > MAX_AMOUNT_MINOR) {
    throw new RangeError(`${what} is too large`);
  }

  return value;
};

// quantity (in thousandths) times a unit price, in minor units.
export const lineTotal = (quantityMilli, unitPriceMinor) => {
  const total = Number(roundDivide(BigInt(quantityMilli) * BigInt(unitPriceMinor), 1000n));

  return assertAmount(total, "A line total");
};

export const taxAmount = (subtotalMinor, taxRateBps) => {
  return Number(roundDivide(BigInt(subtotalMinor) * BigInt(taxRateBps), 10000n));
};

// items: [{ quantityMilli, unitPriceMinor }]. Returns each line's total, plus the subtotal,
// the tax and the grand total.
export const calculateTotals = (items, taxRateBps) => {
  const lineTotals = items.map((item) => {
    return lineTotal(item.quantityMilli, item.unitPriceMinor);
  });
  const subtotal = lineTotals.reduce((sum, amount) => {
    return sum + amount;
  }, 0);
  const tax = taxAmount(subtotal, taxRateBps);

  return { lineTotals, subtotal, taxAmount: tax, total: subtotal + tax };
};

// "1.5" or 1.5 -> 1500. Up to 3 decimals, between 0.001 and 1,000,000. Anything else
// (including numbers written like 1e-7) gives null.
export const parseQuantityMilli = (value) => {
  const match = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(String(value).trim());

  if (!match) {
    return null;
  }

  const milli = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));

  return milli >= 1 && milli <= MAX_QUANTITY_MILLI ? milli : null;
};

// 1500 -> "1.5", 2000 -> "2", 1 -> "0.001".
export const formatQuantity = (milli) => {
  const whole = Math.floor(milli / 1000);
  const fraction = String(milli % 1000)
    .padStart(3, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : String(whole);
};
