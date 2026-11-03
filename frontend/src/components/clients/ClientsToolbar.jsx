import { Search } from "lucide-react";
import { SORT_OPTIONS, STATUS_LABELS, VIEW_LABELS } from "../../features/clients/constants.js";
import { Button } from "../ui/index.js";

const controlClass =
  "rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

const ClientsToolbar = ({
  filters,
  tags,
  searchText,
  onSearchTextChange,
  onChange,
  onClear,
  isFiltered,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search clients"
          placeholder="Search name, email or contact"
          value={searchText}
          onChange={(event) => {
            onSearchTextChange(event.target.value);
          }}
          className={`${controlClass} w-full pl-9`}
        />
      </div>

      <select
        aria-label="Status"
        value={filters.status}
        onChange={(event) => {
          onChange({ status: event.target.value });
        }}
        className={controlClass}
      >
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => {
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>

      <select
        aria-label="Tag"
        value={filters.tag}
        onChange={(event) => {
          onChange({ tag: event.target.value });
        }}
        className={controlClass}
      >
        <option value="">All tags</option>
        {tags.map((tag) => {
          return (
            <option key={tag.name} value={tag.name}>
              {tag.name} ({tag.count})
            </option>
          );
        })}
        {/* A tag from the address that no longer exists still needs an option to show. */}
        {filters.tag &&
          !tags.some((tag) => {
            return tag.name === filters.tag;
          }) && <option value={filters.tag}>{filters.tag}</option>}
      </select>

      <select
        aria-label="Show"
        value={filters.view}
        onChange={(event) => {
          onChange({ view: event.target.value });
        }}
        className={controlClass}
      >
        {Object.entries(VIEW_LABELS).map(([value, label]) => {
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>

      <select
        aria-label="Sort"
        value={filters.sortKey}
        onChange={(event) => {
          onChange({ sortKey: event.target.value });
        }}
        className={controlClass}
      >
        {SORT_OPTIONS.map((option) => {
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>

      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
};

export default ClientsToolbar;
