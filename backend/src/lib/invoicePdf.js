import PDFDocument from "pdfkit";
import { formatMinor } from "./money.js";

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
const FOOTER_SPACE = 90;

// The built-in PDF fonts only cover Latin-1. Anything else would print as garbage, so it
// becomes a "?" instead.
const safe = (value) => {
  return String(value ?? "").replace(/[^\n\u0020-\u00FF]/g, "?");
};

// "2026-11-16" -> "16 Nov 2026"
const formatDate = (iso) => {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const percentOf = (bps) => {
  return Number((bps / 100).toFixed(2));
};

// Draws one invoice and gives back the PDF as a Buffer.
//   invoice: the API shape (label, status, currency, dates, totals, notes, projectName)
//   items:   [{ description, quantity, unitPriceMinor, lineTotalMinor }]
//   client:  { companyName, billingAddress, billingEmail, taxId }
//   issuer:  { name }
export const renderInvoicePdf = ({ invoice, items, client, issuer }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: { Title: `Invoice ${invoice.label ?? "draft"}`, Author: safe(issuer.name) },
    });
    const chunks = [];
    const money = (minor) => {
      return formatMinor(minor, invoice.currency);
    };
    const limit = () => {
      return doc.page.height - FOOTER_SPACE;
    };

    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);

    // A faint word across the page for drafts and voided invoices.
    const drawWatermark = () => {
      if (invoice.status !== "draft" && invoice.status !== "void") {
        return;
      }

      const { x, y } = doc;

      doc.save();
      doc.rotate(-35, { origin: [PAGE_WIDTH / 2, doc.page.height / 2] });
      doc
        .font("Helvetica-Bold")
        .fontSize(110)
        .fillColor("#000000")
        .opacity(0.06)
        .text(invoice.status === "void" ? "VOID" : "DRAFT", 0, doc.page.height / 2 - 60, {
          width: PAGE_WIDTH,
          align: "center",
          lineBreak: false,
        });
      doc.restore();
      doc.x = x;
      doc.y = y;
    };

    const drawTableHeader = (top) => {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#777777");
      doc.text("DESCRIPTION", MARGIN, top, { width: 265, lineBreak: false });
      doc.text("QTY", 325, top, { width: 50, align: "right", lineBreak: false });
      doc.text("PRICE", 380, top, { width: 80, align: "right", lineBreak: false });
      doc.text("AMOUNT", 465, top, { width: RIGHT_EDGE - 465, align: "right", lineBreak: false });
      doc
        .moveTo(MARGIN, top + 14)
        .lineTo(RIGHT_EDGE, top + 14)
        .lineWidth(0.5)
        .strokeColor("#cccccc")
        .stroke();

      return top + 24;
    };

    try {
      doc.on("pageAdded", drawWatermark);
      drawWatermark();

      // Header.
      doc.font("Helvetica-Bold").fontSize(16).fillColor("#111111");
      doc.text(safe(issuer.name), MARGIN, MARGIN, { width: 280 });
      doc.font("Helvetica-Bold").fontSize(22).fillColor("#111111");
      doc.text("INVOICE", 345, MARGIN, { width: RIGHT_EDGE - 345, align: "right" });
      doc.font("Helvetica").fontSize(11).fillColor("#555555");
      doc.text(invoice.label ?? "Draft", 345, MARGIN + 28, {
        width: RIGHT_EDGE - 345,
        align: "right",
      });

      // Bill to (left).
      let top = 130;

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#777777");
      doc.text("BILL TO", MARGIN, top, { width: 260 });
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#111111");
      doc.text(safe(client.companyName), MARGIN, top + 14, { width: 260 });
      doc.font("Helvetica").fontSize(10).fillColor("#333333");

      [client.billingAddress, client.billingEmail, client.taxId ? `Tax ID: ${client.taxId}` : null]
        .filter(Boolean)
        .forEach((line) => {
          doc.text(safe(line), MARGIN, doc.y, { width: 260 });
        });

      const leftEnd = doc.y;

      // Dates and project (right).
      const facts = [
        ["Issued", formatDate(invoice.issueDate)],
        ["Due", formatDate(invoice.dueDate)],
        ["Currency", invoice.currency],
        ...(invoice.projectName ? [["Project", safe(invoice.projectName)]] : []),
      ];
      let factY = top;

      facts.forEach(([label, value]) => {
        doc.font("Helvetica").fontSize(9).fillColor("#777777");
        doc.text(label, 345, factY, { width: 70, lineBreak: false });
        doc.font("Helvetica").fontSize(10).fillColor("#111111");
        doc.text(value, 420, factY, { width: RIGHT_EDGE - 420, align: "right", lineBreak: false });
        factY += 16;
      });

      top = Math.max(leftEnd, factY) + 30;

      // Lines.
      let y = drawTableHeader(top);

      items.forEach((item) => {
        const description = safe(item.description);

        doc.font("Helvetica").fontSize(10);

        const height = Math.max(doc.heightOfString(description, { width: 265 }), 14);

        if (y + height > limit()) {
          doc.addPage();
          y = drawTableHeader(MARGIN);
        }

        doc.fillColor("#111111");
        doc.text(description, MARGIN, y, { width: 265 });
        doc.text(safe(item.quantity), 325, y, { width: 50, align: "right", lineBreak: false });
        doc.text(money(item.unitPriceMinor), 380, y, {
          width: 80,
          align: "right",
          lineBreak: false,
        });
        doc.text(money(item.lineTotalMinor), 465, y, {
          width: RIGHT_EDGE - 465,
          align: "right",
          lineBreak: false,
        });
        y += height + 8;
      });

      // Totals.
      if (y + 90 > limit()) {
        doc.addPage();
        y = MARGIN;
      }

      doc.moveTo(345, y).lineTo(RIGHT_EDGE, y).lineWidth(0.5).strokeColor("#cccccc").stroke();
      y += 10;

      const totalRows = [
        ["Subtotal", money(invoice.subtotalMinor), false],
        [`Tax (${percentOf(invoice.taxRateBps)}%)`, money(invoice.taxMinor), false],
        ["Total", money(invoice.totalMinor), true],
      ];

      totalRows.forEach(([label, value, strong]) => {
        doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 12 : 10);
        doc.fillColor("#111111");
        doc.text(label, 345, y, { width: 120, lineBreak: false });
        doc.text(value, 465, y, { width: RIGHT_EDGE - 465, align: "right", lineBreak: false });
        y += strong ? 22 : 17;
      });

      // Notes.
      if (invoice.notes) {
        y += 16;
        doc.font("Helvetica").fontSize(10);

        const noteHeight = doc.heightOfString(safe(invoice.notes), { width: RIGHT_EDGE - MARGIN });

        if (y + noteHeight + 20 > limit()) {
          doc.addPage();
          y = MARGIN;
        }

        doc.font("Helvetica-Bold").fontSize(8).fillColor("#777777");
        doc.text("NOTES", MARGIN, y, { width: 200 });
        doc.font("Helvetica").fontSize(10).fillColor("#333333");
        doc.text(safe(invoice.notes), MARGIN, y + 14, { width: RIGHT_EDGE - MARGIN });
      }

      // Page numbers, written last so we know how many pages there are. The bottom margin is
      // lifted for a moment, or writing in it would start a new page.
      const range = doc.bufferedPageRange();

      for (let index = 0; index < range.count; index += 1) {
        doc.switchToPage(range.start + index);

        const margin = doc.page.margins.bottom;

        doc.page.margins.bottom = 0;
        doc.font("Helvetica").fontSize(8).fillColor("#999999");
        doc.text(`Page ${index + 1} of ${range.count}`, MARGIN, doc.page.height - 40, {
          width: RIGHT_EDGE - MARGIN,
          align: "center",
          lineBreak: false,
        });
        doc.page.margins.bottom = margin;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
