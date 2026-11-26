import { X } from "lucide-react";
import { Button } from "../ui/index.js";
import { emptyLine } from "../../features/invoices/invoiceForm.js";
import { formatMoney } from "../../lib/money.js";

const MAX_LINES = 100;

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60";

const Problem = ({ message }) => {
  return message ? <p className="mt-1 text-sm text-clay-600">{message}</p> : null;
};

// The rows of an invoice. `errors` and `lineTotals` are keyed by each line's key.
const InvoiceLinesEditor = ({ items, currency, errors, lineTotals, disabled, onChange }) => {
  const updateLine = (key, changes) => {
    onChange(
      items.map((line) => {
        return line.key === key ? { ...line, ...changes } : line;
      }),
    );
  };

  const removeLine = (key) => {
    const rest = items.filter((line) => {
      return line.key !== key;
    });

    // There's always one row to type into.
    onChange(rest.length > 0 ? rest : [emptyLine()]);
  };

  return (
    <div>
      <ol className="space-y-3">
        {items.map((line, index) => {
          const problems = errors[line.key] ?? {};
          const total = lineTotals[line.key];

          return (
            <li key={line.key} className="rounded-control border border-line bg-surface p-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_auto] sm:items-start">
                <div>
                  <input
                    type="text"
                    aria-label={`Line ${index + 1} description`}
                    placeholder="Description"
                    autoComplete="off"
                    maxLength={500}
                    disabled={disabled}
                    value={line.description}
                    onChange={(event) => {
                      updateLine(line.key, { description: event.target.value });
                    }}
                    className={controlClass}
                  />
                  <Problem message={problems.description} />
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Line ${index + 1} quantity`}
                    placeholder="Qty"
                    disabled={disabled}
                    value={line.quantity}
                    onChange={(event) => {
                      updateLine(line.key, { quantity: event.target.value });
                    }}
                    className={`${controlClass} text-right`}
                  />
                  <Problem message={problems.quantity} />
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Line ${index + 1} price`}
                    placeholder="Price"
                    disabled={disabled}
                    value={line.price}
                    onChange={(event) => {
                      updateLine(line.key, { price: event.target.value });
                    }}
                    className={`${controlClass} text-right`}
                  />
                  <Problem message={problems.price} />
                </div>

                <p
                  aria-label={`Line ${index + 1} total`}
                  className="text-sm text-ink tabular-nums sm:pt-2 sm:text-right"
                >
                  {total === undefined || total === null ? "-" : formatMoney(total, currency)}
                </p>

                <button
                  type="button"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={disabled}
                  onClick={() => {
                    removeLine(line.key);
                  }}
                  className="grid size-9 place-items-center justify-self-end rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || items.length >= MAX_LINES}
          onClick={() => {
            onChange([...items, emptyLine()]);
          }}
        >
          Add a line
        </Button>
        <p className="text-xs text-ink-muted">
          {items.length} of {MAX_LINES} lines
        </p>
      </div>
    </div>
  );
};

export default InvoiceLinesEditor;
