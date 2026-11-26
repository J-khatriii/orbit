// Payments can now also come from Stripe. A Stripe payment always has the id Stripe gave it,
// which is unique, so the same payment arriving twice is only ever recorded once. The
// database also keeps "online" and "stripe" in step, so they can't disagree.
export const up = async (knex) => {
  await knex.raw("ALTER TABLE invoice_payments ADD COLUMN source text NOT NULL DEFAULT 'manual'");
  await knex.raw("ALTER TABLE invoice_payments ADD COLUMN external_id text");
  await knex.raw(
    "ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_source_check CHECK (source IN ('manual', 'stripe'))",
  );
  await knex.raw(
    "ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_external_unique UNIQUE (external_id)",
  );
  await knex.raw(
    "ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_external_check CHECK ((source = 'stripe') = (external_id IS NOT NULL))",
  );
  await knex.raw("ALTER TABLE invoice_payments DROP CONSTRAINT invoice_payments_method_check");
  await knex.raw(
    "ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_method_check CHECK (method IN ('bank_transfer', 'cash', 'card', 'cheque', 'other', 'online'))",
  );
  await knex.raw(
    "ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_online_check CHECK ((source = 'stripe') = (method = 'online'))",
  );
};

// Rolling back fails on purpose if online payments already exist: they can't be turned
// into manual ones.
export const down = async (knex) => {
  await knex.raw("ALTER TABLE invoice_payments DROP CONSTRAINT invoice_payments_online_check");
  await knex.raw("ALTER TABLE invoice_payments DROP CONSTRAINT invoice_payments_method_check");
  await knex.raw(
    "ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_method_check CHECK (method IN ('bank_transfer', 'cash', 'card', 'cheque', 'other'))",
  );
  await knex.raw("ALTER TABLE invoice_payments DROP CONSTRAINT invoice_payments_external_check");
  await knex.raw("ALTER TABLE invoice_payments DROP CONSTRAINT invoice_payments_external_unique");
  await knex.raw("ALTER TABLE invoice_payments DROP CONSTRAINT invoice_payments_source_check");
  await knex.raw("ALTER TABLE invoice_payments DROP COLUMN external_id");
  await knex.raw("ALTER TABLE invoice_payments DROP COLUMN source");
};
