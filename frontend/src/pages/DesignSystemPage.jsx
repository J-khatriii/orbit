import { useState } from "react";
import { ArrowUpRight, CircleCheck, Layers, MessageCircle, Plus, Receipt } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  StatCard,
  Table,
  Tabs,
  useToast,
} from "../components/ui/index.js";
import { cn } from "../lib/cn.js";

const swatches = [
  { name: "canvas", className: "bg-canvas" },
  { name: "surface", className: "bg-surface" },
  { name: "sunken", className: "bg-sunken" },
  { name: "line", className: "bg-line" },
  { name: "ink", className: "bg-ink" },
  { name: "brand-600", className: "bg-brand-600" },
  { name: "brand-100", className: "bg-brand-100" },
  { name: "sage-600", className: "bg-sage-600" },
  { name: "sage-100", className: "bg-sage-100" },
  { name: "clay-600", className: "bg-clay-600" },
  { name: "clay-100", className: "bg-clay-100" },
];

const statusTone = { Active: "sage", Review: "brand", Overdue: "clay", Draft: "neutral" };

const columns = [
  {
    key: "name",
    header: "Client",
    render: (row) => {
      return (
        <span className="flex items-center gap-3 font-medium text-ink">
          <Avatar name={row.name} size="sm" />
          {row.name}
        </span>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      return <Badge tone={statusTone[row.status]}>{row.status}</Badge>;
    },
  },
  { key: "projects", header: "Projects" },
  { key: "balance", header: "Balance" },
];

const rows = [
  { id: 1, name: "Still Studio", status: "Review", projects: 3, balance: "$3,600" },
  { id: 2, name: "Forma Co", status: "Overdue", projects: 1, balance: "$1,200" },
  { id: 3, name: "Noma Packaging", status: "Active", projects: 2, balance: "$0" },
  { id: 4, name: "Lumen Labs", status: "Draft", projects: 0, balance: "$1,800" },
];

const tabItems = [
  { id: "all", label: "All invoices", count: 6 },
  { id: "unpaid", label: "Unpaid", count: 2 },
  { id: "paid", label: "Paid", count: 3 },
  { id: "drafts", label: "Drafts", count: 1 },
];

const Section = ({ title, children }) => {
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium tracking-wider text-ink-muted uppercase">{title}</h2>
      {children}
    </section>
  );
};

const DesignSystemPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [email, setEmail] = useState("");
  const toast = useToast();

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Design system"
        title="A little space to do great work."
        subtitle="Every shared building block in one place. Visible in development only."
        actions={<Button icon={Plus}>New project</Button>}
      />

      <Section title="Colour">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map((swatch) => {
            return (
              <div key={swatch.name}>
                <div className={cn("h-14 rounded-control ring-1 ring-line", swatch.className)} />
                <p className="mt-1.5 text-xs text-ink-soft">{swatch.name}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Type">
        <Card>
          <div className="space-y-4">
            <p className="font-display text-6xl leading-none">Make room for what matters.</p>
            <p className="font-display text-4xl leading-none">$4,800</p>
            <p className="text-lg font-medium">Work in motion</p>
            <p className="max-w-prose text-sm text-ink-soft">
              Body text uses Inter. It stays calm and readable at small sizes, so tables, forms and
              messages never feel busy.
            </p>
            <p className="text-xs font-medium tracking-wider text-ink-muted uppercase">
              Eyebrow label
            </p>
          </div>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={Plus}>Primary</Button>
          <Button variant="secondary" icon={ArrowUpRight}>
            Secondary
          </Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Badges, avatars, progress">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="brand">In review</Badge>
          <Badge tone="sage">On track</Badge>
          <Badge tone="clay">Overdue</Badge>
          <Badge>Draft</Badge>
          <Avatar name="Alex Morgan" />
          <Avatar name="Jamie Chen" tone="brand" />
          <Avatar name="Alex Morgan Studio" tone="ink" square />
        </div>
        <div className="mt-5 grid max-w-md gap-4">
          <ProgressBar value={68} label="Still" />
          <ProgressBar value={45} tone="clay" label="Forma" />
          <ProgressBar value={25} tone="sage" label="Noma" />
        </div>
      </Section>

      <Section title="Stat cards">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active projects"
            value="03"
            hint="2 on track · 1 in review"
            icon={Layers}
          />
          <StatCard label="Your tasks this week" value="08" hint="3 due today" icon={CircleCheck} />
          <StatCard
            label="Awaiting client approval"
            value="02"
            hint="Still · Visual identity"
            icon={MessageCircle}
          />
          <StatCard
            label="Outstanding invoices"
            value="$4,800"
            hint="$1,200 overdue"
            hintTone="clay"
            icon={Receipt}
          />
        </div>
      </Section>

      <Section title="Cards and tones">
        <div className="grid gap-4 md:grid-cols-3">
          <Card eyebrow="A little focus" tone="brand" title="Make room for what matters today.">
            <p className="text-sm text-ink-soft">The tinted card pulls attention gently.</p>
          </Card>
          <Card eyebrow="Needs a nudge" tone="clay" title="Forma is 5 days overdue.">
            <Button variant="secondary" size="sm">
              Send reminder
            </Button>
          </Card>
          <Card eyebrow="All clear" tone="sage" title="Nothing in the way.">
            <p className="text-sm text-ink-soft">No blocked tasks this week.</p>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs items={tabItems} value={tab} onChange={setTab} />
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-md gap-4">
          <Input label="Client name" placeholder="Acme Inc." hint="Shown on invoices." />
          <Input
            label="Email (type something without @ to see the error)"
            type="email"
            value={email}
            onChange={(e) => {
              return setEmail(e.target.value);
            }}
            error={email && !email.includes("@") ? "Enter a valid email address" : undefined}
          />
          <Input label="Disabled" disabled defaultValue="Read only" />
        </div>
      </Section>

      <Section title="Table">
        <Table columns={columns} rows={rows} />
      </Section>

      <Section title="Modal and toasts">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              return setModalOpen(true);
            }}
          >
            Open modal
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              return toast.success("Client saved");
            }}
          >
            Success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              return toast.error("Something went wrong");
            }}
          >
            Error toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              return toast.show("A little heads-up");
            }}
          >
            Info toast
          </Button>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => {
          return setModalOpen(false);
        }}
        title="Delete this client?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                return setModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setModalOpen(false);
                toast.success("Client deleted");
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        This removes the client and cannot be undone.
      </Modal>
    </div>
  );
};

export default DesignSystemPage;
