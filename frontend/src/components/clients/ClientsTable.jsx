import { STATUS_LABELS, STATUS_TONES } from "../../features/clients/constants.js";
import { Avatar, Badge } from "../ui/index.js";

// Four columns from tablet width up. On a phone each row stacks.
const GRID = "md:grid-cols-[minmax(0,2fr)_9rem_minmax(0,1.5fr)_7rem]";

const formatDate = (value) => {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const ClientRow = ({ client }) => {
  const shownTags = client.tags.slice(0, 3);
  const hiddenCount = client.tags.length - shownTags.length;

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 ${GRID}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={client.companyName} square />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{client.companyName}</p>
          <p className="truncate text-sm text-ink-soft">
            {client.billingEmail ?? "No billing email"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 justify-self-end md:justify-self-start">
        <Badge tone={STATUS_TONES[client.status]} dot>
          {STATUS_LABELS[client.status]}
        </Badge>
        {client.archivedAt && <Badge tone="clay">Archived</Badge>}
      </div>

      <div className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1">
        {shownTags.map((tag) => {
          return (
            <span key={tag} className="rounded-full bg-sunken px-2 py-0.5 text-xs text-ink-soft">
              {tag}
            </span>
          );
        })}
        {hiddenCount > 0 && <span className="text-xs text-ink-muted">+{hiddenCount}</span>}
      </div>

      <p className="col-span-2 text-xs text-ink-muted md:col-span-1 md:text-right md:text-sm">
        Added {formatDate(client.createdAt)}
      </p>
    </li>
  );
};

const ClientsTable = ({ clients }) => {
  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
      <div
        className={`hidden gap-x-4 border-b border-line bg-sunken/60 px-4 py-2.5 text-xs font-medium tracking-wide text-ink-muted uppercase md:grid ${GRID}`}
      >
        <span>Client</span>
        <span>Status</span>
        <span>Tags</span>
        <span className="text-right">Added</span>
      </div>
      <ul className="divide-y divide-line">
        {clients.map((client) => {
          return <ClientRow key={client.id} client={client} />;
        })}
      </ul>
    </div>
  );
};

export default ClientsTable;
