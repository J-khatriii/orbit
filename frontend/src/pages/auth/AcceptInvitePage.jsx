import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import AuthCard from "../../components/auth/AuthCard.jsx";
import AuthLink from "../../components/auth/AuthLink.jsx";
import FormError from "../../components/auth/FormError.jsx";
import { Badge, Button, Input, Spinner, useToast } from "../../components/ui/index.js";
import { useAuth } from "../../features/auth/authContext.js";
import { ROLE_LABELS } from "../../features/auth/roles.js";
import { useAcceptInvitation, useLogout } from "../../features/auth/useAuthActions.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { validateAcceptInvite } from "../../features/auth/validation.js";
import { useInvitationPreview } from "../../features/invitations/useInvitationPreview.js";

// Who the invitation is for and what they're being invited to.
const InviteSummary = ({ invitation }) => {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-control bg-sunken px-4 py-3 text-sm">
      <span className="min-w-0 truncate text-ink-soft">{invitation.email}</span>
      <Badge tone="brand">{ROLE_LABELS[invitation.role] ?? invitation.role}</Badge>
    </div>
  );
};

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { status, user, refetch, setActiveWorkspaceId } = useAuth();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation();
  const logout = useLogout();
  const form = useAuthForm({ name: "", password: "", confirmPassword: "" });
  const [actionError, setActionError] = useState("");

  const invitation = preview.data;

  // Runs after the account was updated. Open the workspace they just joined.
  const finish = (result) => {
    setActiveWorkspaceId(result.workspaceId);
    toast.show(`You've joined ${invitation.workspaceName}.`);
    navigate("/", { replace: true });
  };

  const handleAccept = () => {
    setActionError("");
    accept.mutate(
      { token },
      {
        onSuccess: finish,
        onError: (error) => {
          setActionError(error.message);
        },
      },
    );
  };

  const submitNewAccount = (values, options) => {
    accept.mutate(
      { token, name: values.name.trim(), password: values.password },
      { ...options, onSuccess: finish },
    );
  };

  const goSignIn = () => {
    navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
  };

  const invalidCard = (
    <AuthCard
      title="This invitation isn't valid."
      subtitle="It may have expired, been cancelled, or been replaced by a newer one. Ask whoever invited you to send a fresh link."
      footer={<AuthLink to="/login">Go to sign in</AuthLink>}
    >
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          navigate("/");
        }}
      >
        Back to Orbit
      </Button>
    </AuthCard>
  );

  if (!token) {
    return invalidCard;
  }

  if (status === "loading" || preview.isPending) {
    return (
      <AuthCard title="Checking your invitation…">
        <div role="status" className="flex justify-center py-4 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      </AuthCard>
    );
  }

  if (status === "error" || preview.error?.code === "NETWORK_ERROR") {
    return (
      <AuthCard
        title="We can't reach Orbit right now."
        subtitle="Check your connection and try again."
      >
        <Button
          className="w-full"
          onClick={() => {
            refetch();
            preview.refetch();
          }}
        >
          Try again
        </Button>
      </AuthCard>
    );
  }

  if (preview.isError) {
    return invalidCard;
  }

  const title = `Join ${invitation.workspaceName}.`;
  const subtitle = invitation.invitedByName
    ? `${invitation.invitedByName} invited you to collaborate.`
    : "You've been invited to collaborate.";

  if (status === "signedIn") {
    const matches = user.email.toLowerCase() === invitation.email.toLowerCase();

    if (!matches) {
      return (
        <AuthCard
          title="This invitation is for someone else."
          subtitle={`It was sent to ${invitation.email}, but you're signed in as ${user.email}.`}
          footer={<AuthLink to="/">Stay signed in and go back</AuthLink>}
        >
          <Button
            size="lg"
            className="w-full"
            loading={logout.isPending}
            onClick={() => {
              logout.mutate();
            }}
          >
            Sign out and continue
          </Button>
        </AuthCard>
      );
    }

    return (
      <AuthCard title={title} subtitle={subtitle}>
        <InviteSummary invitation={invitation} />
        <div className="space-y-5">
          <FormError message={actionError} />
          <Button size="lg" className="w-full" loading={accept.isPending} onClick={handleAccept}>
            Accept invitation
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (invitation.accountExists) {
    return (
      <AuthCard
        title={title}
        subtitle={`${subtitle} You already have an Orbit account, so sign in to accept.`}
      >
        <InviteSummary invitation={invitation} />
        <Button size="lg" className="w-full" onClick={goSignIn}>
          Sign in to continue
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={title} subtitle={`${subtitle} Create your account to get started.`}>
      <InviteSummary invitation={invitation} />
      <form
        noValidate
        onSubmit={form.handleSubmit(validateAcceptInvite, submitNewAccount)}
        className="space-y-5"
      >
        <FormError message={form.formError} />
        <Input label="Email" name="email" type="email" value={invitation.email} readOnly />
        <Input
          label="Your name"
          name="name"
          autoComplete="name"
          value={form.values.name}
          onChange={form.handleChange("name")}
          error={form.errors.name}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters."
          value={form.values.password}
          onChange={form.handleChange("password")}
          error={form.errors.password}
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.values.confirmPassword}
          onChange={form.handleChange("confirmPassword")}
          error={form.errors.confirmPassword}
        />
        <Button type="submit" size="lg" loading={accept.isPending} className="w-full">
          Create account and join
        </Button>
      </form>
    </AuthCard>
  );
};

export default AcceptInvitePage;
