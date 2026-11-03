import { Card } from "../ui/index.js";

const Row = ({ label, children }) => {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm wrap-break-word whitespace-pre-line text-ink">
        {children || <span className="text-ink-muted">—</span>}
      </dd>
    </div>
  );
};

const ClientDetails = ({ client, defaultCurrency }) => {
  return (
    <Card title="Details">
      <dl className="divide-y divide-line">
        <Row label="Billing email">
          {client.billingEmail && (
            <a href={`mailto:${client.billingEmail}`} className="text-brand-700 hover:underline">
              {client.billingEmail}
            </a>
          )}
        </Row>
        <Row label="Billing address">{client.billingAddress}</Row>
        <Row label="Tax ID">{client.taxId}</Row>
        <Row label="Currency">
          {client.currency ?? (defaultCurrency ? `${defaultCurrency} (workspace default)` : "")}
        </Row>
        <Row label="Internal notes">
          {client.notesInternal && (
            <>
              {client.notesInternal}
              <span className="mt-1 block text-xs text-ink-muted">Only your team sees this.</span>
            </>
          )}
        </Row>
      </dl>
    </Card>
  );
};

export default ClientDetails;
