const CLIENT_COLUMNS = [
  "id",
  "company_name",
  "status",
  "billing_email",
  "billing_address",
  "tax_id",
  "currency",
  "notes_internal",
  "tags",
  "archived_at",
  "created_at",
  "updated_at",
];

const SORT_COLUMNS = { name: "company_name", created: "created_at" };

// Users type % and _ as normal characters. Neutralise them so they aren't wildcards.
const escapeLike = (value) => {
  return value.replace(/[\\%_]/g, "\\$&");
};

const applyFilters = (executor, query, { workspaceId, search, status, tag, view }) => {
  query.where("clients.workspace_id", workspaceId);

  if (view === "active") {
    query.whereNull("clients.archived_at");
  } else if (view === "archived") {
    query.whereNotNull("clients.archived_at");
  }
  if (status) {
    query.where("clients.status", status);
  }
  if (tag) {
    query.whereRaw("? = ANY(clients.tags)", [tag]);
  }
  if (search) {
    const pattern = `%${escapeLike(search)}%`;

    query.where((group) => {
      group
        .whereILike("clients.company_name", pattern)
        .orWhereILike("clients.billing_email", pattern)
        .orWhereExists((sub) => {
          sub
            .select(executor.raw("1"))
            .from("contacts")
            .whereRaw("contacts.client_id = clients.id")
            .where((who) => {
              who.whereILike("contacts.name", pattern).orWhereILike("contacts.email", pattern);
            });
        });
    });
  }

  return query;
};

export const list = async (executor, { sort, order, limit, offset, ...filters }) => {
  const filtered = () => {
    return applyFilters(executor, executor("clients"), filters);
  };

  const countRow = await filtered().count({ count: "*" }).first();
  const rows = await filtered()
    .select(
      CLIENT_COLUMNS.map((column) => {
        return `clients.${column}`;
      }),
    )
    // The id is a tie-breaker, so pages never repeat or skip a row.
    .orderBy([{ column: `clients.${SORT_COLUMNS[sort]}`, order }, { column: "clients.id" }])
    .limit(limit)
    .offset(offset);

  return { rows, total: Number(countRow.count) };
};

export const findById = async (executor, { workspaceId, id }) => {
  return executor("clients").where({ workspace_id: workspaceId, id }).first(CLIENT_COLUMNS);
};

export const create = async (executor, columns) => {
  const [row] = await executor("clients").insert(columns).returning(CLIENT_COLUMNS);

  return row;
};

export const update = async (executor, { workspaceId, id, columns }) => {
  const [row] = await executor("clients")
    .where({ workspace_id: workspaceId, id })
    .update({ ...columns, updated_at: executor.fn.now() })
    .returning(CLIENT_COLUMNS);

  return row;
};

export const setArchived = async (executor, { workspaceId, id, archived }) => {
  const [row] = await executor("clients")
    .where({ workspace_id: workspaceId, id })
    .update({
      archived_at: archived ? executor.fn.now() : null,
      updated_at: executor.fn.now(),
    })
    .returning(CLIENT_COLUMNS);

  return row;
};

// Tags in use by active clients, with how many clients use each.
export const tagCounts = async (executor, workspaceId) => {
  const result = await executor.raw(
    `SELECT tag AS name, count(*)::int AS count
     FROM clients, unnest(tags) AS tag
     WHERE workspace_id = ? AND archived_at IS NULL
     GROUP BY tag
     ORDER BY tag`,
    [workspaceId],
  );

  return result.rows;
};
