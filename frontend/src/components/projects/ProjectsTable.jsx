import { Ellipsis } from "lucide-react";
import { Link } from "react-router";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES } from "../../features/projects/constants.js";
import { formatDay, isOverdue } from "../../lib/dates.js";
import { formatMoney } from "../../lib/money.js";
import { Badge, Dropdown, DropdownItem } from "../ui/index.js";

// A phone shows name, status and the menu on one line, then due date and budget below.
// From tablet width up it's five columns.
const GRID =
  "grid-cols-[minmax(0,1fr)_auto_2rem] md:grid-cols-[minmax(0,2.2fr)_8rem_9rem_8rem_2rem]";

const RowMenu = ({ project, canArchive, onEdit, onToggleArchive }) => {
  return (
    <Dropdown
      align="right"
      className="col-start-3 row-start-1 md:col-start-5"
      renderTrigger={({ open, toggle, ref }) => {
        return (
          <button
            ref={ref}
            type="button"
            aria-label={`Actions for ${project.name}`}
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
                onEdit(project);
              }}
            >
              Edit
            </DropdownItem>
            {canArchive && (
              <DropdownItem
                onClick={() => {
                  close();
                  onToggleArchive(project);
                }}
              >
                {project.archivedAt ? "Restore" : "Archive"}
              </DropdownItem>
            )}
          </>
        );
      }}
    </Dropdown>
  );
};

const ProjectRow = ({ project, defaultCurrency, canArchive, onEdit, onToggleArchive }) => {
  const overdue = isOverdue(project.dueDate, project.status);

  return (
    <li className={`grid items-center gap-x-4 gap-y-1.5 px-4 py-3 ${GRID}`}>
      <div className="col-start-1 row-start-1 min-w-0">
        <Link
          to={`/projects/${project.id}`}
          className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline"
        >
          {project.name}
        </Link>
        <p className="truncate text-sm text-ink-soft">{project.clientName}</p>
      </div>

      <div className="col-start-2 row-start-1 flex flex-wrap items-center gap-1.5 justify-self-end md:justify-self-start">
        <Badge tone={PROJECT_STATUS_TONES[project.status]} dot>
          {PROJECT_STATUS_LABELS[project.status]}
        </Badge>
        {project.archivedAt && <Badge tone="clay">Archived</Badge>}
      </div>

      <RowMenu
        project={project}
        canArchive={canArchive}
        onEdit={onEdit}
        onToggleArchive={onToggleArchive}
      />

      <p
        className={`col-span-3 text-sm md:col-span-1 ${overdue ? "font-medium text-clay-700" : "text-ink-soft"}`}
      >
        {project.dueDate
          ? `${overdue ? "Overdue · " : "Due "}${formatDay(project.dueDate)}`
          : "No due date"}
      </p>

      <p className="col-span-3 text-sm text-ink-soft md:col-span-1 md:text-right">
        {project.budgetMinor === null
          ? "No budget"
          : formatMoney(project.budgetMinor, project.currency ?? defaultCurrency ?? "USD")}
      </p>
    </li>
  );
};

const ProjectsTable = ({ projects, defaultCurrency, canArchive, onEdit, onToggleArchive }) => {
  return (
    <div className="rounded-card bg-surface shadow-card ring-1 ring-line">
      <div
        className={`hidden gap-x-4 rounded-t-card border-b border-line bg-sunken/60 px-4 py-2.5 text-xs font-medium tracking-wide text-ink-muted uppercase md:grid ${GRID}`}
      >
        <span>Project</span>
        <span>Status</span>
        <span>Due</span>
        <span className="text-right">Budget</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {projects.map((project) => {
          return (
            <ProjectRow
              key={project.id}
              project={project}
              defaultCurrency={defaultCurrency}
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

export default ProjectsTable;
