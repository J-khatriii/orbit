// Which Stripe account receives a workspace's online payments. Only the account id and its
// readiness are stored here: Orbit never holds the agency's Stripe credentials.
//
// The primary key includes livemode, so a workspace can have a sandbox account and a real one
// side by side, and switching keys never points at the wrong account.
export const up = async (knex) => {
  await knex.raw(`
    CREATE TABLE stripe_accounts (
      workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
      livemode boolean NOT NULL,
      stripe_account_id text NOT NULL,
      charges_enabled boolean NOT NULL DEFAULT false,
      details_submitted boolean NOT NULL DEFAULT false,
      country text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (workspace_id, livemode),
      CONSTRAINT stripe_accounts_account_unique UNIQUE (stripe_account_id),
      CONSTRAINT stripe_accounts_account_check CHECK (stripe_account_id ~ '^acct_[A-Za-z0-9]+$')
    )
  `);
};

export const down = async (knex) => {
  await knex.raw("DROP TABLE stripe_accounts");
};
