import { Link, useSearchParams } from "react-router";
import InvoiceEditor from "../components/invoices/InvoiceEditor.jsx";
import { Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { useClient } from "../features/clients/useClients.js";

const NewInvoicePage = () => {
  const [searchParams] = useSearchParams();
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canManage = role === "owner" || role === "admin";
  const clientId = searchParams.get("clientId") ?? "";
  const clientQuery = useClient(workspaceId, clientId, canManage && Boolean(clientId));

  if (!canManage) {
    return (
      <Card title="New invoice">
        <p className="text-sm text-ink-soft">Only owners and admins can create invoices.</p>
      </Card>
    );
  }
  if (!clientId) {
    return (
      <Card title="New invoice">
        <p className="mb-4 text-sm text-ink-soft">
          Open a client and use its Invoices tab to start an invoice for them.
        </p>
        <Link to="/clients" className="text-sm font-medium text-brand-700 hover:underline">
          Go to clients
        </Link>
      </Card>
    );
  }
  if (clientQuery.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (clientQuery.isError) {
    return (
      <Card title="We couldn't load this client">
        <p className="text-sm text-ink-soft">{clientQuery.error.message}</p>
      </Card>
    );
  }

  const client = clientQuery.data;

  if (client.archivedAt) {
    return (
      <Card title="New invoice">
        <p className="text-sm text-ink-soft">
          {client.companyName} is archived. Restore it before creating an invoice.
        </p>
      </Card>
    );
  }

  return (
    <InvoiceEditor
      workspaceId={workspaceId}
      client={client}
      invoice={null}
      defaultCurrency={activeWorkspace?.defaultCurrency}
    />
  );
};

export default NewInvoicePage;
