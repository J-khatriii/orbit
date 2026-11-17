import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge.jsx";
import { Button, Card, Modal, useToast } from "../ui/index.js";
import { useVoidInvoice } from "../../features/invoices/useInvoiceMutations.js";
import { formatDay } from "../../lib/dates.js";
import { formatMoney } from "../../lib/money.js";
import { invoicePdfUrl } from "../../features/invoices/invoicesApi.js";

const InvoiceView = ({ workspaceId, invoice }) => {
  const toast = useToast();
  const voidInvoice = useVoidInvoice();
  const [confirming, setConfirming] = useState(false);

  const handleVoid = async () => {
    // Close the dialog first, so the toast isn't hidden behind it.
    setConfirming(false);

    try {
      await voidInvoice.mutateAsync({ workspaceId, invoiceId: invoice.id });
      toast.show(`${invoice.label} was voided.`);
    } catch (error) {
      toast.show(error.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        to={`/clients/${invoice.clientId}?tab=invoices`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {invoice.clientName}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{invoice.label}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            for{" "}
            <Link to={`/clients/${invoice.clientId}`} className="text-brand-700 hover:underline">
              {invoice.clientName}
            </Link>
            {invoice.projectName ? `, ${invoice.projectName}` : ""}
          </p>
          <div className="mt-2">
            <InvoiceStatusBadge invoice={invoice} />
          </div>
        </div>

        {invoice.status === "sent" && (
          <Button
            variant="secondary"
            loading={voidInvoice.isPending}
            onClick={() => {
              setConfirming(true);
            }}
          >
            Void invoice
          </Button>
        )}
      </header>

      <div>
        <a
          href={invoicePdfUrl(workspaceId, invoice.id)}
          className="inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-sunken"
        >
          <Download className="size-4" aria-hidden="true" />
          Download PDF
        </a>
      </div>

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
          {invoice.items.map((item) => {
            return (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
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

      <Modal
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        title="Void this invoice?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Keep it
            </Button>
            <Button onClick={handleVoid}>Void invoice</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          A voided invoice keeps its number but no longer counts as owed. This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
};

export default InvoiceView;
