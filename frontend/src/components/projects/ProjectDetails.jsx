import { Link } from "react-router";
import { Card } from "../ui/index.js";
import { formatDay, isOverdue } from "../../lib/dates.js";
import { formatMoney } from "../../lib/money.js";
import TaskProgress from "./TaskProgress.jsx";

const Row = ({ label, children }) => {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm wrap-break-word whitespace-pre-line text-ink">
        {children || <span className="text-ink-muted">—</span>}
      </dd>
    </div>
  );
};

const ProjectDetails = ({ project, defaultCurrency }) => {
  const overdue = isOverdue(project.dueDate, project.status);
  const currency = project.currency ?? defaultCurrency ?? "USD";

  return (
    <Card title="Details">
      <dl className="divide-y divide-line">
        <Row label="Client">
          <Link to={`/clients/${project.clientId}`} className="text-brand-700 hover:underline">
            {project.clientName}
          </Link>
        </Row>
        <Row label="Progress">
          <TaskProgress done={project.tasksDone} total={project.taskCount} />
        </Row>
        <Row label="Start date">{project.startDate && formatDay(project.startDate)}</Row>
        <Row label="Due date">
          {project.dueDate && (
            <span className={overdue ? "font-medium text-clay-700" : undefined}>
              {overdue ? "Overdue · " : ""}
              {formatDay(project.dueDate)}
            </span>
          )}
        </Row>
        <Row label="Budget">
          {project.budgetMinor !== null && formatMoney(project.budgetMinor, currency)}
        </Row>
        <Row label="Description">{project.description}</Row>
      </dl>
    </Card>
  );
};

export default ProjectDetails;
