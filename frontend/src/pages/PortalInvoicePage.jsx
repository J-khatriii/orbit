import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, CreditCard, Download } from "lucide-react";
import InvoiceStatusBadge from "../components/invoices/InvoiceStatusBadge.jsx";
import { Button, Card, Spinner, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { portalInvoicePdfUrl } from "../features/portal/portalInvoicesApi.js";
import { usePortalInvoice, useStartCheckout } from "../features/portal/usePortalInvoices.js";
import { formatDay } from "../lib/dates.js";
import { formatMoney } from "../lib/money.js";

const CONFIRM_WINDOW_MS = 60 * 1000;

const PortalInvoicePage = () => {
  const { invoiceId } = useParams();
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceId = activeWorkspace?.id;
  const isClient = activeWorkspace?.role === "client";

  // Stripe sends the client back with ?payment=success or ?payment=cancelled. It is read once
  // when the page opens, then removed from the address so a refresh doesn't repeat it.
  const [outcome] = useState(() => {
    const result = searchParams.get("payment");

    return result === "success" || result === "cancelled" ? result : null;
  });
  const [waiting, setWaiting] = useState(outcome === "success");

  const query = usePortalInvoice(workspaceId, invoiceId, isClient, waiting);
  const checkout = useStartCheckout(workspaceId, invoiceId);

  useEffect(() => {
    if (searchParams.has("payment")) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // The webhook normally lands within seconds. After a minute we stop checking and say so.
  useEffect(() => {
    if (!waiting) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setWaiting(false);
    }, CONFIRM_WINDOW_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [waiting]);

  const handlePay = () => {
    checkout.mutate(undefined, {
      onSuccess: (data) => {
        window.location.assign(data.url);
      },
      onError: (error) => {
        toast.show(error.message);
      },
    });
  };

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
  const paid = invoice.status === "paid";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        to="/portal/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All invoices
      </Link>

      {outcome === "success" && paid && (
        <Card tone="sage">
          <p role="status" className="text-sm text-sage-700">
            Payment received. Thank you.
          </p>
        </Card>
      )}
      {outcome === "success" && !paid && waiting && (
        <Card tone="brand">
          <p role="status" className="text-sm text-brand-700">
            Thank you. We're confirming your payment with Stripe. This usually takes a few seconds.
          </p>
        </Card>
      )}
      {outcome === "success" && !paid && !waiting && (
        <Card tone="clay">
          <p role="status" className="text-sm text-clay-700">
            We haven't received confirmation of your payment yet. If you were charged, it will show
            here shortly. Check again in a minute.
          </p>
        </Card>
      )}
      {outcome === "cancelled" && !paid && (
        <Card>
          <p role="status" className="text-sm text-ink-soft">
            No payment was taken. You can pay whenever you're ready.
          </p>
        </Card>
      )}

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

        <div className="flex flex-wrap gap-2">
          {invoice.canPayOnline && (
            <Button
              icon={CreditCard}
              loading={checkout.isPending || checkout.isSuccess}
              onClick={handlePay}
            >
              Pay {formatMoney(invoice.balanceMinor, invoice.currency)}
            </Button>
          )}
          <a
            href={portalInvoicePdfUrl(workspaceId, invoice.id)}
            className="inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-sunken"
          >
            <Download className="size-4" aria-hidden="true" />
            Download PDF
          </a>
        </div>
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
          {invoice.amountPaidMinor > 0 && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Paid</dt>
                <dd className="text-ink tabular-nums">
                  {formatMoney(invoice.amountPaidMinor, invoice.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-base font-medium">
                <dt className="text-ink">Balance due</dt>
                <dd className="text-ink tabular-nums">
                  {formatMoney(invoice.balanceMinor, invoice.currency)}
                </dd>
              </div>
            </>
          )}
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
