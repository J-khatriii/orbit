import { Link, useParams } from "react-router";
import InvoiceEditor from "../components/invoices/InvoiceEditor.jsx";
import InvoiceView from "../components/invoices/InvoiceView.jsx";
import { Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { useInvoice } from "../features/invoices/useInvoices.js";

const InvoicePage = () => {
  const { invoiceId } = useParams();
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canManage = role === "owner" || role === "admin";
  const query = useInvoice(workspaceId, invoiceId, canManage);

  if (!canManage) {
    return (
      <Card title="Invoice">
        <p className="text-sm text-ink-soft">Only owners and admins can see invoices.</p>
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
          {missing ? "It may have been deleted, or the link is wrong." : query.error.message}
        </p>
        <Link to="/invoices" className="text-sm font-medium text-brand-700 hover:underline">
          Back to all invoices
        </Link>
      </Card>
    );
  }

  const invoice = query.data.invoice;

  if (invoice.status === "draft") {
    return (
      <InvoiceEditor
        key={invoice.id}
        workspaceId={workspaceId}
        client={{ id: invoice.clientId, companyName: invoice.clientName }}
        invoice={invoice}
        defaultCurrency={activeWorkspace?.defaultCurrency}
      />
    );
  }

  return <InvoiceView workspaceId={workspaceId} invoice={invoice} />;
};

export default InvoicePage;
