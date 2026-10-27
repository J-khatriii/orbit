import { CircleCheck, Layers, MessageCircle, Plus, Receipt } from "lucide-react";
import { Badge, Button, Card, PageHeader, StatCard, useToast } from "../components/ui/index.js";
import { useDatabaseHealth, useServerHealth } from "../features/health/useHealth.js";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const today = () => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const statusOf = (query) => {
  if (query.isError) return { tone: "clay", text: "Offline" };
  if (query.isSuccess) return { tone: "sage", text: "Online" };
  return { tone: "neutral", text: "Checking" };
};

const StatusRow = ({ label, query }) => {
  const { tone, text } = statusOf(query);

  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <Badge tone={tone}>{text}</Badge>
    </li>
  );
};

const DashboardPage = () => {
  const server = useServerHealth();
  const database = useDatabaseHealth();
  const toast = useToast();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={today()}
        title="A little space to do great work."
        subtitle={`${greeting()}. Everything in its orbit.`}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              return toast.show("Projects arrive in Phase 3");
            }}
          >
            New project
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value="00" hint="Arrives in Phase 3" icon={Layers} />
        <StatCard
          label="Your tasks this week"
          value="00"
          hint="Arrives in Phase 4"
          icon={CircleCheck}
        />
        <StatCard
          label="Awaiting client approval"
          value="00"
          hint="Arrives in Phase 6"
          icon={MessageCircle}
        />
        <StatCard
          label="Outstanding invoices"
          value="$0"
          hint="Arrives in Phase 7"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Work in motion" className="lg:col-span-2">
          <div className="flex flex-col items-start gap-4 rounded-control bg-sunken/60 p-6">
            <p className="font-display text-3xl leading-tight text-ink">
              Your projects will live here.
            </p>
            <p className="max-w-md text-sm text-ink-soft">
              Once you add a client and a project, progress, due dates and review status show up in
              this space.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                return toast.show("Clients and projects arrive in Phase 3");
              }}
            >
              Add your first client
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card eyebrow="A little focus" tone="brand">
            <p className="font-display text-3xl leading-tight text-ink">
              Make room for what matters today.
            </p>
          </Card>

          <Card title="System status">
            <ul className="space-y-3">
              <StatusRow label="API server" query={server} />
              <StatusRow label="Database" query={database} />
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
