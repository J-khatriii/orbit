import { useNavigate } from "react-router";
import InvoiceList from "../invoices/InvoiceList.jsx";
import { Button, Card, Spinner } from "../ui/index.js";
import { useInvoices } from "../../features/invoices/useInvoices.js";

const ClientInvoices = ({ workspaceId, client }) => {
  const navigate = useNavigate();
  const invoices = useInvoices(workspaceId, { clientId: client.id });

  const renderBody = () => {
    if (invoices.isPending) {
      return (
        <div role="status" className="flex justify-center py-6 text-ink-muted">
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
          No invoices yet. Create the first one for {client.companyName}.
        </p>
      );
    }

    return (
      <>
        <InvoiceList invoices={invoices.data.invoices} />
        {invoices.data.total > invoices.data.invoices.length && (
          <p className="mt-3 text-xs text-ink-muted">
            Showing the newest {invoices.data.invoices.length} of {invoices.data.total} invoices.
          </p>
        )}
      </>
    );
  };

  return (
    <Card
      title="Invoices"
      actions={
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(client.archivedAt)}
          onClick={() => {
            navigate(`/invoices/new?clientId=${client.id}`);
          }}
        >
          New invoice
        </Button>
      }
    >
      {client.archivedAt && (
        <p className="mb-3 text-sm text-ink-soft">
          This client is archived. Restore it to create new invoices.
        </p>
      )}
      {renderBody()}
    </Card>
  );
};

export default ClientInvoices;
