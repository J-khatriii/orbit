import * as invoiceService from "../services/invoice.service.js";

export const listInvoices = async (req, res) => {
  const result = await invoiceService.listInvoices({
    workspaceId: req.workspace.id,
    query: req.validated.query,
  });

  res.json(result);
};

export const getInvoice = async (req, res) => {
  const result = await invoiceService.getInvoice({
    workspaceId: req.workspace.id,
    invoiceId: req.params.invoiceId,
  });

  res.json(result);
};

export const createInvoice = async (req, res) => {
  const result = await invoiceService.createInvoice({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    input: req.validated.body,
  });

  res.status(201).json(result);
};

export const updateInvoice = async (req, res) => {
  const result = await invoiceService.updateInvoice({
    workspaceId: req.workspace.id,
    invoiceId: req.params.invoiceId,
    input: req.validated.body,
  });

  res.json(result);
};

export const sendInvoice = async (req, res) => {
  const result = await invoiceService.sendInvoice({
    workspaceId: req.workspace.id,
    invoiceId: req.params.invoiceId,
  });

  res.json(result);
};

export const voidInvoice = async (req, res) => {
  const result = await invoiceService.voidInvoice({
    workspaceId: req.workspace.id,
    invoiceId: req.params.invoiceId,
  });

  res.json(result);
};

export const deleteInvoice = async (req, res) => {
  await invoiceService.deleteInvoice({
    workspaceId: req.workspace.id,
    invoiceId: req.params.invoiceId,
  });

  res.status(204).end();
};

export const downloadPdf = async (req, res) => {
  const { pdf, filename } = await invoiceService.getInvoicePdf({
    workspaceId: req.workspace.id,
    invoiceId: req.params.invoiceId,
  });
  // ?inline=1 opens it in the browser. Otherwise it downloads.
  const type = req.query.inline === "1" ? "inline" : "attachment";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", pdf.length);
  res.setHeader("Content-Disposition", `${type}; filename="${filename}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(pdf);
};
