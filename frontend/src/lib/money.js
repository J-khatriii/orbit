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
