import { useState } from "react";
import { Button, Input, Modal, Select, useToast } from "../ui/index.js";
import { PAYMENT_METHODS } from "../../features/invoices/constants.js";
import { useRecordPayment } from "../../features/invoices/useInvoiceMutations.js";
import { fieldErrorsOf } from "../../lib/api.js";
import { formatMoney, minorToInput, parseMoney } from "../../lib/money.js";

// Today in the browser's own time zone, as YYYY-MM-DD.
const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
};

// Render this only while the dialog is open, so the form starts fresh every time.
const RecordPaymentModal = ({ workspaceId, invoice, onClose }) => {
  const toast = useToast();
  const recordPayment = useRecordPayment();
  const [amount, setAmount] = useState(minorToInput(invoice.balanceMinor, invoice.currency));
  const [paidOn, setPaidOn] = useState(today());
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    const parsed = parseMoney(amount, invoice.currency);
    const next = {};

    if (parsed.error) {
      next.amountMinor = parsed.error;
    } else if (parsed.minor === null || parsed.minor < 1) {
      next.amountMinor = "Enter an amount above zero";
    } else if (parsed.minor > invoice.balanceMinor) {
      next.amountMinor = "That is more than the amount still due";
    }
    if (!paidOn) {
      next.paidOn = "Choose the date it was received";
    }

    setErrors(next);

    if (Object.keys(next).length > 0) {
      return;
    }

    try {
      const result = await recordPayment.mutateAsync({
        workspaceId,
        invoiceId: invoice.id,
        input: { amountMinor: parsed.minor, paidOn, method, reference },
      });

      // Close the dialog first, so the toast isn't hidden behind it.
      onClose();
      toast.show(
        result.invoice.status === "paid"
          ? "Payment recorded. The invoice is now paid."
          : "Payment recorded.",
      );
    } catch (error) {
      const fields = fieldErrorsOf(error) ?? {};

      setErrors(Object.keys(fields).length > 0 ? fields : { form: error.message });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record a payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={recordPayment.isPending} onClick={handleSubmit}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label={`Amount (${invoice.currency})`}
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
          }}
          error={errors.amountMinor}
          hint={`Still due: ${formatMoney(invoice.balanceMinor, invoice.currency)}`}
        />
        <Input
          label="Date received"
          type="date"
          value={paidOn}
          onChange={(event) => {
            setPaidOn(event.target.value);
          }}
          error={errors.paidOn}
        />
        <Select
          label="How it was paid"
          value={method}
          onChange={(event) => {
            setMethod(event.target.value);
          }}
          error={errors.method}
        >
          {PAYMENT_METHODS.map((option) => {
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </Select>
        <Input
          label="Reference (optional)"
          value={reference}
          onChange={(event) => {
            setReference(event.target.value);
          }}
          error={errors.reference}
          hint="A transfer id, cheque number or note"
        />
        {errors.form && (
          <p role="alert" className="text-sm text-clay-600">
            {errors.form}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default RecordPaymentModal;
