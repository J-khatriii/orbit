import { useDatabaseHealth, useServerHealth } from "../features/health/useHealth.js";

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

      <section className="mt-6 max-w-md rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">System status</h2>
        <ul className="mt-3 space-y-2">
          <StatusRow label="API server" query={server} />
          <StatusRow label="Database" query={database} />
        </ul>
      </section>
    </div>
  );
};

export default DashboardPage;
