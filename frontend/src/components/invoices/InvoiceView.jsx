import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Banknote, Download, Mail, Trash2 } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge.jsx";
import RecordPaymentModal from "./RecordPaymentModal.jsx";
import { Button, Card, Modal, useToast } from "../ui/index.js";
import { METHOD_LABELS } from "../../features/invoices/constants.js";
import {
  useEmailInvoice,
  useRemovePayment,
  useVoidInvoice,
} from "../../features/invoices/useInvoiceMutations.js";
import { formatDay } from "../../lib/dates.js";
import { formatMoney } from "../../lib/money.js";
import { invoicePdfUrl } from "../../features/invoices/invoicesApi.js";

const formatSentTime = (isoTime) => {
  return new Date(isoTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const formatPaidDay = (isoTime) => {
  return new Date(isoTime).toLocaleDateString(undefined, { dateStyle: "medium" });
};

const emailedLine = (invoice) => {
  if (!invoice.lastEmailedAt) {
    return "Not emailed to the client yet.";
  }

  const times = invoice.emailCount === 1 ? "1 time" : `${invoice.emailCount} times`;

  return `Last emailed ${formatSentTime(invoice.lastEmailedAt)} (${times}).`;
};

const InvoiceView = ({ workspaceId, invoice }) => {
  const toast = useToast();
  const voidInvoice = useVoidInvoice();
  const emailInvoice = useEmailInvoice();
  const removePayment = useRemovePayment();
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [removing, setRemoving] = useState(null);
  const hasPayments = invoice.amountPaidMinor > 0;
  const showPayments = invoice.status === "sent" || invoice.status === "paid";

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

  const handleEmail = async () => {
    try {
      const result = await emailInvoice.mutateAsync({ workspaceId, invoiceId: invoice.id });

      toast.show(
        result.emailed === 1
          ? "Invoice emailed to 1 person."
          : `Invoice emailed to ${result.emailed} people.`,
      );
    } catch (error) {
      toast.show(error.message);
    }
  };

  const handleRemovePayment = async () => {
    const payment = removing;

    setRemoving(null);

    try {
      await removePayment.mutateAsync({
        workspaceId,
        invoiceId: invoice.id,
        paymentId: payment.id,
      });
      toast.show("Payment removed.");
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
          {invoice.status === "sent" && (
            <p className="mt-2 text-xs text-ink-muted">{emailedLine(invoice)}</p>
          )}
          {invoice.status === "paid" && invoice.paidAt && (
            <p className="mt-2 text-xs text-ink-muted">
              Paid in full on {formatPaidDay(invoice.paidAt)}.
            </p>
          )}
        </div>

        {invoice.status === "sent" && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setPaying(true);
              }}
            >
              <Banknote className="size-4" aria-hidden="true" />
              Record payment
            </Button>
            <Button variant="secondary" loading={emailInvoice.isPending} onClick={handleEmail}>
              <Mail className="size-4" aria-hidden="true" />
              {invoice.emailCount > 0 ? "Resend email" : "Email client"}
            </Button>
            <Button
              variant="secondary"
              disabled={hasPayments}
              loading={voidInvoice.isPending}
              onClick={() => {
                setConfirming(true);
              }}
            >
              Void invoice
            </Button>
          </div>
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
          {hasPayments && (
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

      {showPayments && (
        <Card title="Payments">
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-ink-soft">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {invoice.payments.map((payment) => {
                const details = [
                  payment.reference,
                  payment.recordedByName ? `recorded by ${payment.recordedByName}` : "",
                ].filter(Boolean);

                return (
                  <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <div className="min-w-40 flex-1">
                      <p className="text-sm text-ink">
                        {METHOD_LABELS[payment.method]} on {formatDay(payment.paidOn)}
                      </p>
                      {details.length > 0 && (
                        <p className="text-sm text-ink-soft">{details.join(", ")}</p>
                      )}
                    </div>
                    <p className="w-28 text-right text-sm font-medium text-ink tabular-nums">
                      {formatMoney(payment.amountMinor, invoice.currency)}
                    </p>
                    {payment.source === "stripe" ? (
                      <span className="size-8" aria-hidden="true" />
                    ) : (
                      <button
                        type="button"
                        aria-label={`Remove the payment of ${formatMoney(payment.amountMinor, invoice.currency)}`}
                        onClick={() => {
                          setRemoving(payment);
                        }}
                        className="rounded-control p-2 text-ink-muted transition-colors hover:bg-sunken hover:text-clay-600"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                    ``
                  </li>
                );
              })}
            </ul>
          )}
          {invoice.status === "sent" && hasPayments && (
            <p className="mt-3 text-xs text-ink-muted">
              To void this invoice, remove its payments first. Online payments can only be refunded
              in your Stripe dashboard.
            </p>
          )}
        </Card>
      )}

      {invoice.notes && (
        <Card title="Notes">
          <p className="text-sm whitespace-pre-line text-ink">{invoice.notes}</p>
        </Card>
      )}

      {paying && (
        <RecordPaymentModal
          workspaceId={workspaceId}
          invoice={invoice}
          onClose={() => {
            setPaying(false);
          }}
        />
      )}

      <Modal
        open={removing !== null}
        onClose={() => {
          setRemoving(null);
        }}
        title="Remove this payment?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRemoving(null);
              }}
            >
              Keep it
            </Button>
            <Button loading={removePayment.isPending} onClick={handleRemovePayment}>
              Remove payment
            </Button>
          </>
        }
      >
        {removing && (
          <p className="text-sm text-ink-soft">
            Remove the {formatMoney(removing.amountMinor, invoice.currency)} payment from{" "}
            {formatDay(removing.paidOn)}? If the invoice was marked paid, it goes back to sent.
          </p>
        )}
      </Modal>

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
