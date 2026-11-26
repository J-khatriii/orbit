import { useState } from "react";
import InvoiceList from "../components/invoices/InvoiceList.jsx";
import { Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { usePortalClients } from "../features/portal/usePortal.js";
import { usePortalInvoices } from "../features/portal/usePortalInvoices.js";

const PortalInvoicesPage = () => {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const isClient = activeWorkspace?.role === "client";
  const clients = usePortalClients(workspaceId, isClient);
  const [chosenId, setChosenId] = useState("");
  const invoices = usePortalInvoices(workspaceId, chosenId, isClient);

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

  if (invoices.isPending || clients.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (invoices.isError) {
    return (
      <Card title="We couldn't load your invoices">
        <p className="text-sm text-ink-soft">{invoices.error.message}</p>
      </Card>
    );
  }

  const clientList = clients.data ?? [];
  const list = invoices.data.invoices;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Invoices</h1>
        <p className="mt-1 text-sm text-ink-soft">Invoices your team has sent you.</p>

        {clientList.length > 1 && (
          <div className="mt-3 max-w-xs">
            <label
              htmlFor="portal-invoices-client"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Show invoices from
            </label>
            <select
              id="portal-invoices-client"
              value={chosenId}
              onChange={(event) => {
                setChosenId(event.target.value);
              }}
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">Everyone</option>
              {clientList.map((candidate) => {
                return (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
          <h2 className="font-display text-2xl text-ink">No invoices yet.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            When your team sends you an invoice, it will show up here.
          </p>
        </div>
      ) : (
        <Card>
          <InvoiceList
            invoices={list}
            showClient={clientList.length > 1}
            basePath="/portal/invoices"
          />
          {invoices.data.total > list.length && (
            <p className="mt-3 text-xs text-ink-muted">
              Showing the newest {list.length} of {invoices.data.total} invoices.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default PortalInvoicesPage;
