import { describe, expect, it } from "vitest";
import { renderInvoicePdf } from "../src/lib/invoicePdf.js";
import { formatMinor } from "../src/lib/money.js";

const invoice = (overrides = {}) => {
  return {
    label: "INV-0001",
    status: "sent",
    currency: "USD",
    issueDate: "2026-11-16",
    dueDate: "2026-12-16",
    taxRateBps: 1800,
    subtotalMinor: 15000,
    taxMinor: 2700,
    totalMinor: 17700,
    notes: "Please pay by bank transfer.",
    projectName: "Website",
    ...overrides,
  };
};

const items = [
  { description: "Design", quantity: "2", unitPriceMinor: 5000, lineTotalMinor: 10000 },
  { description: "Development", quantity: "1.5", unitPriceMinor: 3333, lineTotalMinor: 5000 },
];

const client = {
  companyName: "Alpha Co",
  billingAddress: "1 Main Street\nSpringfield",
  billingEmail: "billing@alpha.example",
  taxId: "TAX-123",
};

const issuer = { name: "Studio Co" };

const render = (overrides = {}) => {
  return renderInvoicePdf({ invoice: invoice(), items, client, issuer, ...overrides });
};

// Page objects are stored as plain text in a PDF, so they can be counted.
const pagesOf = (buffer) => {
  return (buffer.toString("latin1").match(/\/Type \/Page(?!s)/g) ?? []).length;
};

describe("invoice PDF", () => {
  it("renders a one-page PDF", async () => {
    const pdf = await render();

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pagesOf(pdf)).toBe(1);
  });

  it("continues a long invoice over more pages", async () => {
    const many = Array.from({ length: 100 }, (unused, index) => {
      return {
        description: `Line number ${index + 1}`,
        quantity: "1",
        unitPriceMinor: 1000,
        lineTotalMinor: 1000,
      };
    });

    const pdf = await render({ items: many });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pagesOf(pdf)).toBeGreaterThan(2);
  });

  it("copes with drafts, voids, missing details and awkward text", async () => {
    const awkward = [
      { description: "x".repeat(400), quantity: "1", unitPriceMinor: 100, lineTotalMinor: 100 },
      { description: "résumé review", quantity: "1", unitPriceMinor: 100, lineTotalMinor: 100 },
      {
        // Escapes, not literal characters: Devanagari text and a musical symbol, which sits
        // outside the basic character range like emoji do.
        description: "\u0928\u092E\u0938\u094D\u0924\u0947 and \u{1D11E}",
        quantity: "1",
        unitPriceMinor: 100,
        lineTotalMinor: 100,
      },
    ];
    const bare = { companyName: "Bare Co", billingAddress: null, billingEmail: null, taxId: null };
    const variants = [
      { invoice: invoice({ status: "draft", label: null, notes: null, projectName: null }) },
      { invoice: invoice({ status: "void" }) },
      { invoice: invoice({ status: "paid" }) },
      { invoice: invoice({ notes: "A note. ".repeat(200) }), items: awkward },
      { client: bare },
      { invoice: invoice({ currency: "JPY" }) },
    ];

    for (const overrides of variants) {
      const pdf = await render(overrides);

      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    }
  });

  it("writes amounts with the currency code and the right decimals", () => {
    expect(formatMinor(5000, "USD")).toBe("USD 50.00");
    expect(formatMinor(123456789, "USD")).toBe("USD 1,234,567.89");
    expect(formatMinor(5000, "JPY")).toBe("JPY 5,000");
    expect(formatMinor(1234, "KWD")).toBe("KWD 1.234");
  });
});
