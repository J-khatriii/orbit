import FormError from "../auth/FormError.jsx";
import { Button, Input, useToast } from "../ui/index.js";
import { ROLE_LABELS } from "../../features/auth/roles.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { useInviteMember } from "../../features/team/useTeam.js";
import { validateInvite } from "../../features/team/validation.js";

// Which roles each role may hand out. The server enforces the same rule.
const INVITABLE = {
  owner: ["admin", "member", "client"],
  admin: ["member", "client"],
};

const InviteForm = ({ workspaceId, myRole }) => {
  const toast = useToast();
  const invite = useInviteMember();
  const form = useAuthForm({ email: "", role: "member" });
  const roles = INVITABLE[myRole] ?? [];

  const submit = (values, options) => {
    const email = values.email.trim();

    invite.mutate(
      { workspaceId, email, role: values.role },
      {
        ...options,
        onSuccess: () => {
          form.setValue("email", "");
          toast.show(`Invitation sent to ${email}.`);
        },
      },
    );
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(validateInvite, submit, { ALREADY_MEMBER: "email" })}
      className="space-y-4"
    >
      <FormError message={form.formError} />
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <div className="w-full flex-1">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="name@company.com"
            value={form.values.email}
            onChange={form.handleChange("email")}
            error={form.errors.email}
          />
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium text-ink">
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            value={form.values.role}
            onChange={form.handleChange("role")}
            className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {roles.map((role) => {
              return (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              );
            })}
          </select>
          {form.errors.role && <p className="mt-1.5 text-sm text-clay-600">{form.errors.role}</p>}
        </div>
        <Button type="submit" loading={invite.isPending} className="w-full sm:mt-7 sm:w-auto">
          Send invitation
        </Button>
      </div>
      <p className="text-xs text-ink-muted">
        They get an email with a link that works for 7 days. Clients only see what you share with
        them.
      </p>
    </form>
  );
};

export default InviteForm;
