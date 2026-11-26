// Invoices, their lines, and a per-workspace counter for invoice numbers.
//
// Money is whole minor units (bigint). The database refuses a wrong invoice even if the code
// has a bug: total = subtotal + tax, a draft has no number and a sent invoice has one.
// The client foreign key has no ON DELETE action on purpose: a client with invoices can't be
// deleted, only archived.
export const up = async (knex) => {
  await knex.raw(`
    CREATE TABLE invoice_counters (
      workspace_id uuid PRIMARY KEY REFERENCES workspaces (id) ON DELETE CASCADE,
      last_number integer NOT NULL CHECK (last_number >= 0)
    )
  `);

  await knex.raw(`
    CREATE TABLE invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
      client_id uuid NOT NULL,
      project_id uuid,
      number integer,
      status text NOT NULL DEFAULT 'draft',
      currency text NOT NULL,
      issue_date date NOT NULL,
      due_date date NOT NULL,
      tax_rate_bps integer NOT NULL DEFAULT 0,
      subtotal_minor bigint NOT NULL DEFAULT 0,
      tax_minor bigint NOT NULL DEFAULT 0,
      total_minor bigint NOT NULL DEFAULT 0,
      notes text,
      created_by uuid REFERENCES users (id) ON DELETE SET NULL,
      sent_at timestamptz,
      voided_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT invoices_id_workspace_unique UNIQUE (id, workspace_id),
      CONSTRAINT invoices_number_unique UNIQUE (workspace_id, number),
      CONSTRAINT invoices_client_fk
        FOREIGN KEY (client_id, workspace_id) REFERENCES clients (id, workspace_id),
      CONSTRAINT invoices_project_fk
        FOREIGN KEY (project_id, workspace_id) REFERENCES projects (id, workspace_id)
        ON DELETE SET NULL (project_id),
      CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'sent', 'paid', 'void')),
      CONSTRAINT invoices_number_status_check CHECK ((status = 'draft') = (number IS NULL)),
      CONSTRAINT invoices_sent_check CHECK (status = 'draft' OR sent_at IS NOT NULL),
      CONSTRAINT invoices_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
      CONSTRAINT invoices_dates_check CHECK (due_date >= issue_date),
      CONSTRAINT invoices_tax_rate_check CHECK (tax_rate_bps BETWEEN 0 AND 10000),
      CONSTRAINT invoices_amounts_check CHECK (subtotal_minor >= 0 AND tax_minor >= 0),
      CONSTRAINT invoices_total_check CHECK (total_minor = subtotal_minor + tax_minor)
    )
  `);
  await knex.raw(
    "CREATE INDEX invoices_client_idx ON invoices (workspace_id, client_id, created_at DESC)",
  );
  await knex.raw("CREATE INDEX invoices_status_idx ON invoices (workspace_id, status, due_date)");

  await knex.raw(`
    CREATE TABLE invoice_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      invoice_id uuid NOT NULL,
      position integer NOT NULL,
      description text NOT NULL,
      quantity_milli bigint NOT NULL,
      unit_price_minor bigint NOT NULL,
      line_total_minor bigint NOT NULL,
      CONSTRAINT invoice_items_invoice_fk
        FOREIGN KEY (invoice_id, workspace_id) REFERENCES invoices (id, workspace_id)
        ON DELETE CASCADE,
      CONSTRAINT invoice_items_position_unique UNIQUE (invoice_id, position),
      CONSTRAINT invoice_items_position_check CHECK (position >= 1),
      CONSTRAINT invoice_items_description_check CHECK (char_length(description) BETWEEN 1 AND 500),
      CONSTRAINT invoice_items_quantity_check CHECK (quantity_milli BETWEEN 1 AND 1000000000),
      CONSTRAINT invoice_items_price_check CHECK (unit_price_minor BETWEEN 0 AND 1000000000000),
      CONSTRAINT invoice_items_total_check CHECK (line_total_minor BETWEEN 0 AND 1000000000000)
    )
  `);
};

export const down = async (knex) => {
  await knex.raw("DROP TABLE invoice_items");
  await knex.raw("DROP TABLE invoices");
  await knex.raw("DROP TABLE invoice_counters");
};
