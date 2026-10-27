const Table = ({ columns, rows, rowKey = "id", emptyMessage = "Nothing here yet." }) => {
  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-card ring-1 ring-line">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-sunken text-left text-xs tracking-wider text-ink-muted uppercase">
          <tr>
            {columns.map((col) => {
              return (
                <th key={col.key} scope="col" className="px-5 py-3 font-medium">
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center text-ink-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              return (
                <tr key={row[rowKey]} className="transition-colors hover:bg-sunken/40">
                  {columns.map((col) => {
                    return (
                      <td key={col.key} className="px-5 py-4 text-ink-soft">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
