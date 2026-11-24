import { Link } from "react-router";
import InvoiceStatusBadge from "./InvoiceStatusBadge.jsx";
import { formatDay } from "../../lib/dates.js";
import { formatMoney } from "../../lib/money.js";

const InvoiceList = ({ invoices, showClient, basePath = "/invoices" }) => {
  return (
    <ul className="divide-y divide-line">
      {invoices.map((invoice) => {
        return (
          <li key={invoice.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <div className="min-w-40 flex-1">
              <Link
                to={`${basePath}/${invoice.id}`}
                className="text-sm font-medium text-ink hover:text-brand-700 hover:underline"
              >
                {invoice.label ?? "Draft invoice"}
              </Link>
              <p className="text-sm text-ink-soft">
                {showClient ? `${invoice.clientName}, ` : ""}
                due {formatDay(invoice.dueDate)}
              </p>
            </div>
            <InvoiceStatusBadge invoice={invoice} />
            <div className="w-28 text-right tabular-nums">
              <p className="text-sm font-medium text-ink">
                {formatMoney(invoice.totalMinor, invoice.currency)}
              </p>
              {invoice.status === "sent" && invoice.amountPaidMinor > 0 && (
                <p className="text-xs text-ink-muted">
                  {formatMoney(invoice.balanceMinor, invoice.currency)} due
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default InvoiceList;
