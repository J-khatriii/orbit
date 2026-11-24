// Money received against an invoice, and the date an invoice was fully paid.
//
// The amount paid is never stored on the invoice: it is always the sum of these rows, so the
// two can't disagree. The database also refuses a payment of zero or less, an unknown method,
// and an invoice that is marked paid without a paid date (or the reverse).
export const up = async (knex) => {
  await knex.raw("ALTER TABLE invoices ADD COLUMN paid_at timestamptz");
  await knex.raw(
    "ALTER TABLE invoices ADD CONSTRAINT invoices_paid_check CHECK ((status = 'paid') = (paid_at IS NOT NULL))",
  );

  await knex.raw(`
    CREATE TABLE invoice_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      invoice_id uuid NOT NULL,
      amount_minor bigint NOT NULL,
      paid_on date NOT NULL,
      method text NOT NULL,
      reference text,
      recorded_by uuid REFERENCES users (id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT invoice_payments_invoice_fk
        FOREIGN KEY (invoice_id, workspace_id) REFERENCES invoices (id, workspace_id)
        ON DELETE CASCADE,
      CONSTRAINT invoice_payments_amount_check CHECK (amount_minor BETWEEN 1 AND 1000000000000),
      CONSTRAINT invoice_payments_method_check
        CHECK (method IN ('bank_transfer', 'cash', 'card', 'cheque', 'other')),
      CONSTRAINT invoice_payments_reference_check
        CHECK (reference IS NULL OR char_length(reference) BETWEEN 1 AND 200)
    )
  `);
  await knex.raw(
    "CREATE INDEX invoice_payments_invoice_idx ON invoice_payments (invoice_id, paid_on, created_at)",
  );
};

export const down = async (knex) => {
  await knex.raw("DROP TABLE invoice_payments");
  await knex.raw("ALTER TABLE invoices DROP CONSTRAINT invoices_paid_check");
  await knex.raw("ALTER TABLE invoices DROP COLUMN paid_at");
};
