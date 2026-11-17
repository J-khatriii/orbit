import { Link, useParams } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import InvoiceStatusBadge from "../components/invoices/InvoiceStatusBadge.jsx";
import { Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { portalInvoicePdfUrl } from "../features/portal/portalInvoicesApi.js";
import { usePortalInvoice } from "../features/portal/usePortalInvoices.js";
import { formatDay } from "../lib/dates.js";
import { formatMoney } from "../lib/money.js";

const PortalInvoicePage = () => {
  const { invoiceId } = useParams();
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const isClient = activeWorkspace?.role === "client";
  const query = usePortalInvoice(workspaceId, invoiceId, isClient);

  if (!isClient) {
    return (
      <Card title="Client portal">
        <p className="text-sm text-ink-soft">
          This page is what your clients see. People who work in this workspace use the Invoices
          page instead.
        </p>
      </Card>
    );
  }
  if (query.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (query.isError) {
    const missing = query.error.code === "INVOICE_NOT_FOUND";

    return (
      <Card title={missing ? "We couldn't find this invoice" : "We couldn't load this invoice"}>
        <p className="mb-4 text-sm text-ink-soft">
          {missing ? "It may have been removed, or the link is wrong." : query.error.message}
        </p>
        <Link to="/portal/invoices" className="text-sm font-medium text-brand-700 hover:underline">
          Back to your invoices
        </Link>
      </Card>
    );
  }

  const invoice = query.data.invoice;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        to="/portal/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All invoices
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{invoice.label}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            from {activeWorkspace?.name}
            {invoice.projectName ? `, ${invoice.projectName}` : ""}
          </p>
          <div className="mt-2">
            <InvoiceStatusBadge invoice={invoice} />
          </div>
        </div>

        <a
          href={portalInvoicePdfUrl(workspaceId, invoice.id)}
          className="inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-sunken"
        >
          <Download className="size-4" aria-hidden="true" />
          Download PDF
        </a>
      </header>

      <Card title="Details">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink-muted">Issued</dt>
            <dd className="text-ink">{formatDay(invoice.issueDate)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Due</dt>
            <dd className="text-ink">{formatDay(invoice.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Currency</dt>
            <dd className="text-ink">{invoice.currency}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Lines">
        <ul className="divide-y divide-line">
          {invoice.items.map((item, index) => {
            return (
              <li key={index} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                <p className="min-w-40 flex-1 text-sm text-ink">{item.description}</p>
                <p className="text-sm text-ink-soft tabular-nums">
                  {item.quantity} x {formatMoney(item.unitPriceMinor, invoice.currency)}
                </p>
                <p className="w-28 text-right text-sm text-ink tabular-nums">
                  {formatMoney(item.lineTotalMinor, invoice.currency)}
                </p>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 ml-auto max-w-xs space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="text-ink tabular-nums">
              {formatMoney(invoice.subtotalMinor, invoice.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Tax</dt>
            <dd className="text-ink tabular-nums">
              {formatMoney(invoice.taxMinor, invoice.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-medium">
            <dt className="text-ink">Total</dt>
            <dd className="text-ink tabular-nums">
              {formatMoney(invoice.totalMinor, invoice.currency)}
            </dd>
          </div>
        </dl>
      </Card>

      {invoice.notes && (
        <Card title="Notes">
          <p className="text-sm whitespace-pre-line text-ink">{invoice.notes}</p>
        </Card>
      )}
    </div>
  );
};

export default PortalInvoicePage;
