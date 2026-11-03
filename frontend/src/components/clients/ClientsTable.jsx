import { Ellipsis } from "lucide-react";
import { STATUS_LABELS, STATUS_TONES } from "../../features/clients/constants.js";
import { Avatar, Badge, Dropdown, DropdownItem } from "../ui/index.js";
import { Link } from "react-router";

// A phone shows name, status and the menu on one line, then tags and date below.
// From tablet width up it's five columns.
const GRID =
  "grid-cols-[minmax(0,1fr)_auto_2rem] md:grid-cols-[minmax(0,2fr)_9rem_minmax(0,1.5fr)_7rem_2rem]";

const formatDate = (value) => {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const RowMenu = ({ client, canArchive, onEdit, onToggleArchive }) => {
  return (
    <Dropdown
      align="right"
      className="col-start-3 row-start-1 md:col-start-5"
      renderTrigger={({ open, toggle, ref }) => {
        return (
          <button
            ref={ref}
            type="button"
            aria-label={`Actions for ${client.companyName}`}
            aria-expanded={open}
            onClick={toggle}
            className="grid size-8 place-items-center rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <Ellipsis className="size-5" aria-hidden="true" />
          </button>
        );
      }}
    >
      {({ close }) => {
        return (
          <>
            <DropdownItem
              onClick={() => {
                close();
                onEdit(client);
              }}
            >
              Edit
            </DropdownItem>
            {canArchive && (
              <DropdownItem
                onClick={() => {
                  close();
                  onToggleArchive(client);
                }}
              >
                {client.archivedAt ? "Restore" : "Archive"}
              </DropdownItem>
            )}
          </>
        );
      }}
    </Dropdown>
  );
};

const ClientRow = ({ client, canArchive, onEdit, onToggleArchive }) => {
  const shownTags = client.tags.slice(0, 3);
  const hiddenCount = client.tags.length - shownTags.length;

  return (
    <li className={`grid items-center gap-x-4 gap-y-2 px-4 py-3 ${GRID}`}>
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
        <Avatar name={client.companyName} square />
        <div className="min-w-0">
          <Link
            to={`/clients/${client.id}`}
            className="block truncate text-sm font-medium text-ink hover:underline"
          >
            {client.companyName}
          </Link>
          <p className="truncate text-sm text-ink-soft">
            {client.billingEmail ?? "No billing email"}
          </p>
        </div>
      </div>

      <div className="col-start-2 row-start-1 flex flex-wrap items-center gap-1.5 justify-self-end md:justify-self-start">
        <Badge tone={STATUS_TONES[client.status]} dot>
          {STATUS_LABELS[client.status]}
        </Badge>
        {client.archivedAt && <Badge tone="clay">Archived</Badge>}
      </div>

      <RowMenu
        client={client}
        canArchive={canArchive}
        onEdit={onEdit}
        onToggleArchive={onToggleArchive}
      />

      <div className="col-span-3 flex flex-wrap gap-1.5 md:col-span-1">
        {shownTags.map((tag) => {
          return (
            <span key={tag} className="rounded-full bg-sunken px-2 py-0.5 text-xs text-ink-soft">
              {tag}
            </span>
          );
        })}
        {hiddenCount > 0 && <span className="text-xs text-ink-muted">+{hiddenCount}</span>}
      </div>

      <p className="col-span-3 text-xs text-ink-muted md:col-span-1 md:text-right md:text-sm">
        Added {formatDate(client.createdAt)}
      </p>
    </li>
  );
};

const ClientsTable = ({ clients, canArchive, onEdit, onToggleArchive }) => {
  return (
    <div className="rounded-card bg-surface shadow-card ring-1 ring-line">
      <div
        className={`hidden gap-x-4 rounded-t-card border-b border-line bg-sunken/60 px-4 py-2.5 text-xs font-medium tracking-wide text-ink-muted uppercase md:grid ${GRID}`}
      >
        <span>Client</span>
        <span>Status</span>
        <span>Tags</span>
        <span className="text-right">Added</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {clients.map((client) => {
          return (
            <ClientRow
              key={client.id}
              client={client}
              canArchive={canArchive}
              onEdit={onEdit}
              onToggleArchive={onToggleArchive}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default ClientsTable;
