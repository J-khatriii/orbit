import { useDatabaseHealth, useServerHealth } from "../features/health/useHealth.js";
import { Card } from "../components/ui/index.js";

const StatusRow = ({ label, query }) => {
  let text = "Checking...";
  let dot = "bg-slate-300";

  if (query.isError) {
    text = "Offline";
    dot = "bg-red-500";
  } else if (query.isSuccess) {
    text = "Online";
    dot = "bg-emerald-500";
  }

  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="flex items-center gap-2 font-medium text-slate-800">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {text}
      </span>
    </li>
  );
};

const DashboardPage = () => {
  const server = useServerHealth();
  const database = useDatabaseHealth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your business at a glance. The real widgets arrive in Phase 8.
      </p>

      <Card title="System status" className="mt-6 max-w-md">
        <ul className="space-y-2">
          <StatusRow label="API server" query={server} />
          <StatusRow label="Database" query={database} />
        </ul>
      </Card>
    </div>
  );
};

export default DashboardPage;
