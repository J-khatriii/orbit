import { useState } from "react";
import InvoiceList from "../components/invoices/InvoiceList.jsx";
import { Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { STATUS_FILTERS } from "../features/invoices/constants.js";
import { useInvoices } from "../features/invoices/useInvoices.js";

const InvoicesPage = () => {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canManage = role === "owner" || role === "admin";
  const [status, setStatus] = useState("");
  const invoices = useInvoices(workspaceId, { status }, canManage);

  if (!canManage) {
    return (
      <Card title="Invoices">
        <p className="text-sm text-ink-soft">Only owners and admins can see invoices.</p>
      </Card>
    );
  }

  const renderBody = () => {
    if (invoices.isPending) {
      return (
        <div role="status" className="flex justify-center py-10 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (invoices.isError) {
      return <p className="text-sm text-clay-700">{invoices.error.message}</p>;
    }
    if (invoices.data.invoices.length === 0) {
      return (
        <p className="text-sm text-ink-soft">
          {status
            ? "No invoices match this filter."
            : "No invoices yet. Open a client and use its Invoices tab to create the first one."}
        </p>
      );
    }

    return (
      <>
        <InvoiceList invoices={invoices.data.invoices} showClient />
        {invoices.data.total > invoices.data.invoices.length && (
          <p className="mt-3 text-xs text-ink-muted">
            Showing the newest {invoices.data.invoices.length} of {invoices.data.total} invoices.
          </p>
        )}
      </>
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <h1 className="font-display text-3xl text-ink">Invoices</h1>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setStatus(filter.value);
              }}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                active
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "bg-sunken text-ink-soft hover:text-ink"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <Card>{renderBody()}</Card>
    </div>
  );
};

export default InvoicesPage;
