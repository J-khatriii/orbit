import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import InvoiceLinesEditor from "./InvoiceLinesEditor.jsx";
import FormError from "../auth/FormError.jsx";
import { Button, Card, Input, Modal, useToast } from "../ui/index.js";
import {
  blankInvoice,
  inputOf,
  totalsOf,
  validate,
  valuesOf,
} from "../../features/invoices/invoiceForm.js";
import {
  useCreateInvoice,
  useDeleteInvoice,
  useSendInvoice,
  useUpdateInvoice,
} from "../../features/invoices/useInvoiceMutations.js";
import { useProjects } from "../../features/projects/useProjects.js";
import { fieldErrorsOf } from "../../lib/api.js";
import { formatMoney } from "../../lib/money.js";
import { invoicePdfUrl } from "../../features/invoices/invoicesApi.js";

// The client's active projects, the same list the client's Projects tab shows.
const PROJECT_FILTERS = { view: "active", sort: "due", order: "asc", page: 1, pageSize: 100 };

const controlClass =
  "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60";

// `invoice` is the saved draft being edited, or null for a new one. `client` is
// { id, companyName, currency? }.
const InvoiceEditor = ({ workspaceId, client, invoice, defaultCurrency }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateInvoice();
  const update = useUpdateInvoice();
  const send = useSendInvoice();
  const remove = useDeleteInvoice();
  const projects = useProjects(workspaceId, { ...PROJECT_FILTERS, clientId: client.id });
  const [values, setValues] = useState(() => {
    return invoice
      ? valuesOf(invoice)
      : blankInvoice({
          clientId: client.id,
          currency: client.currency ?? defaultCurrency ?? "USD",
        });
  });
  const [problems, setProblems] = useState({ fields: {}, lines: {} });
  const [formError, setFormError] = useState("");
  const [confirming, setConfirming] = useState(null);

  const busy = create.isPending || update.isPending || send.isPending || remove.isPending;
  const totals = totalsOf(values);

  const projectOptions = projects.data?.projects ?? [];
  const hasCurrentProject = projectOptions.some((project) => {
    return project.id === values.projectId;
  });

  const setField = (name, value) => {
    setValues((current) => {
      return { ...current, [name]: value };
    });
    setProblems((current) => {
      return { ...current, fields: { ...current.fields, [name]: undefined } };
    });
  };

  const setItems = (items) => {
    setValues((current) => {
      return { ...current, items };
    });
    setProblems((current) => {
      return { ...current, lines: {} };
    });
  };

  // Checks the form and saves it as a draft. Gives back the saved invoice, or null.
  const persist = async () => {
    const result = validate(values);

    setProblems(result);
    setFormError("");

    if (!result.ok) {
      return null;
    }

    const input = inputOf(values);

    try {
      const saved = invoice
        ? await update.mutateAsync({ workspaceId, invoiceId: invoice.id, input })
        : await create.mutateAsync({ workspaceId, input });

      return saved.invoice;
    } catch (error) {
      const fields = fieldErrorsOf(error);

      setFormError(error.message);
      setProblems((current) => {
        return {
          ...current,
          fields: {
            ...current.fields,
            clientId: fields.clientId,
            projectId: fields.projectId,
            currency: fields.currency,
            issueDate: fields.issueDate,
            dueDate: fields.dueDate,
            taxPercent: fields.taxRateBps,
          },
        };
      });

      return null;
    }
  };

  const handleSave = async () => {
    const saved = await persist();

    if (!saved) {
      return;
    }
    if (!invoice) {
      navigate(`/invoices/${saved.id}`, { replace: true });
    }

    toast.show("Draft saved.");
  };

  const handleSend = async () => {
    // Close the dialog first, so the toast isn't hidden behind it.
    setConfirming(null);

    const saved = await persist();

    if (!saved) {
      return;
    }

    try {
      const sent = await send.mutateAsync({ workspaceId, invoiceId: saved.id });

      navigate(`/invoices/${sent.invoice.id}`, { replace: true });
      toast.show(`${sent.invoice.label} was sent.`);
    } catch (error) {
      // The draft was saved, so a new invoice moves to its own page.
      if (!invoice) {
        navigate(`/invoices/${saved.id}`, { replace: true });
      }

      toast.show(error.message);
    }
  };

  const handleDelete = async () => {
    setConfirming(null);

    try {
      await remove.mutateAsync({ workspaceId, invoiceId: invoice.id });
      navigate(`/clients/${client.id}?tab=invoices`, { replace: true });
      toast.show("Draft deleted.");
    } catch (error) {
      toast.show(error.message);
    }
  };

  const fields = problems.fields;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        to={`/clients/${client.id}?tab=invoices`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {client.companyName}
      </Link>

      <header>
        <h1 className="font-display text-3xl text-ink">
          {invoice ? "Draft invoice" : "New invoice"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">for {client.companyName}</p>
      </header>

      {invoice && (
        <p className="text-sm text-ink-soft">
          <a
            href={invoicePdfUrl(workspaceId, invoice.id, true)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-700 hover:underline"
          >
            Preview PDF
          </a>{" "}
          (shows the last saved draft)
        </p>
      )}

      <FormError message={formError} />

      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="invoice-project" className="mb-1.5 block text-sm font-medium text-ink">
              Project (optional)
            </label>
            <select
              id="invoice-project"
              disabled={busy}
              value={values.projectId}
              onChange={(event) => {
                setField("projectId", event.target.value);
              }}
              className={controlClass}
            >
              <option value="">No project</option>
              {!hasCurrentProject && values.projectId && (
                <option value={values.projectId}>
                  {invoice?.projectName ?? "Current project"}
                </option>
              )}
              {projectOptions.map((project) => {
                return (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                );
              })}
            </select>
            {fields.projectId && <p className="mt-1.5 text-sm text-clay-600">{fields.projectId}</p>}
          </div>

          <Input
            label="Currency"
            name="currency"
            autoComplete="off"
            maxLength={3}
            disabled={busy}
            value={values.currency}
            onChange={(event) => {
              setField("currency", event.target.value.toUpperCase());
            }}
            error={fields.currency}
          />

          <Input
            label="Issue date"
            name="issueDate"
            type="date"
            disabled={busy}
            value={values.issueDate}
            onChange={(event) => {
              setField("issueDate", event.target.value);
            }}
            error={fields.issueDate}
          />

          <Input
            label="Due date"
            name="dueDate"
            type="date"
            disabled={busy}
            value={values.dueDate}
            onChange={(event) => {
              setField("dueDate", event.target.value);
            }}
            error={fields.dueDate}
          />

          <Input
            label="Tax rate (%)"
            name="taxPercent"
            inputMode="decimal"
            autoComplete="off"
            disabled={busy}
            value={values.taxPercent}
            onChange={(event) => {
              setField("taxPercent", event.target.value);
            }}
            error={fields.taxPercent}
            hint="One rate for the whole invoice, like 18 or 7.5."
          />
        </div>
      </Card>

      <Card title="Lines">
        <InvoiceLinesEditor
          items={values.items}
          currency={values.currency}
          errors={problems.lines}
          lineTotals={totals.lineTotals}
          disabled={busy}
          onChange={setItems}
        />

        <dl className="mt-5 ml-auto max-w-xs space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="text-ink tabular-nums">
              {formatMoney(totals.subtotal, values.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Tax ({values.taxPercent || "0"}%)</dt>
            <dd className="text-ink tabular-nums">{formatMoney(totals.tax, values.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-medium">
            <dt className="text-ink">Total</dt>
            <dd className="text-ink tabular-nums">{formatMoney(totals.total, values.currency)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-right text-xs text-ink-muted">
          Totals are checked again when you save.
        </p>
      </Card>

      <Card title="Notes">
        <label htmlFor="invoice-notes" className="sr-only">
          Notes for the client
        </label>
        <textarea
          id="invoice-notes"
          rows={3}
          maxLength={2000}
          disabled={busy}
          placeholder="Payment details or a thank-you note (optional). The client sees this."
          value={values.notes}
          onChange={(event) => {
            setField("notes", event.target.value);
          }}
          className={controlClass}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {invoice && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setConfirming("delete");
              }}
            >
              Delete draft
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            loading={create.isPending || update.isPending}
            onClick={handleSave}
          >
            Save draft
          </Button>
          <Button
            loading={send.isPending}
            disabled={busy}
            onClick={() => {
              setConfirming("send");
            }}
          >
            Send invoice
          </Button>
        </div>
      </div>

      <Modal
        open={confirming === "send"}
        onClose={() => {
          setConfirming(null);
        }}
        title="Send this invoice?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSend}>Send invoice</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Sending gives the invoice its number and locks it. You won&apos;t be able to edit it
          afterwards, only void it. The draft is saved first.
        </p>
      </Modal>

      <Modal
        open={confirming === "delete"}
        onClose={() => {
          setConfirming(null);
        }}
        title="Delete this draft?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(null);
              }}
            >
              Keep it
            </Button>
            <Button onClick={handleDelete}>Delete draft</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          The draft and its lines will be removed. This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
};

export default InvoiceEditor;
