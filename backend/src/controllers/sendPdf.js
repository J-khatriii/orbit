// Sends a rendered PDF. ?inline=1 opens it in the browser, otherwise it downloads.
export const sendPdf = (req, res, { pdf, filename }) => {
  const type = req.query.inline === "1" ? "inline" : "attachment";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", pdf.length);
  res.setHeader("Content-Disposition", `${type}; filename="${filename}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(pdf);
};
