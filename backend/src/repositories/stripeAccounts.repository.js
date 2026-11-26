import "../db/typeParsers.js";

export const find = async (executor, { workspaceId, livemode }) => {
  return executor("stripe_accounts").where({ workspace_id: workspaceId, livemode }).first();
};

// Serializes "connect" clicks for a workspace, so two at once can't create two Stripe accounts.
export const lockWorkspace = async (executor, { workspaceId }) => {
  await executor("workspaces").where({ id: workspaceId }).forUpdate().first(["id"]);
};

export const insert = async (executor, values) => {
  await executor("stripe_accounts").insert(values);
};

export const update = async (executor, { workspaceId, livemode, values }) => {
  await executor("stripe_accounts")
    .where({ workspace_id: workspaceId, livemode })
    .update({ ...values, updated_at: executor.fn.now() });
};

export const remove = async (executor, { workspaceId, livemode }) => {
  await executor("stripe_accounts").where({ workspace_id: workspaceId, livemode }).del();
};
