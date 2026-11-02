import { Badge, Button, Spinner, useToast } from "../ui/index.js";
import { ROLE_LABELS } from "../../features/auth/roles.js";
import { useRevokeInvitation } from "../../features/team/useTeam.js";

const formatDate = (value) => {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const PendingInvitations = ({ workspaceId, invitations, isPending, error }) => {
  const toast = useToast();
  const revoke = useRevokeInvitation();

  const handleRevoke = (invitation) => {
    revoke.mutate(
      { workspaceId, invitationId: invitation.id },
      {
        onSuccess: () => {
          toast.show(`Invitation to ${invitation.email} was cancelled.`);
        },
        onError: (revokeError) => {
          toast.show(revokeError.message);
        },
      },
    );
  };

  if (isPending) {
    return (
      <div role="status" className="flex justify-center py-6 text-ink-muted">
        <Spinner className="size-5" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-clay-700">{error.message}</p>;
  }
  if (invitations.length === 0) {
    return <p className="text-sm text-ink-soft">No pending invitations.</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {invitations.map((invitation) => {
        const revoking = revoke.isPending && revoke.variables?.invitationId === invitation.id;

        return (
          <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{invitation.email}</p>
              <p className="text-sm text-ink-soft">
                {invitation.invitedByName ? `Invited by ${invitation.invitedByName} · ` : ""}
                expires {formatDate(invitation.expiresAt)}
              </p>
            </div>
            <Badge tone="neutral">{ROLE_LABELS[invitation.role] ?? invitation.role}</Badge>
            <Button
              variant="danger"
              size="sm"
              loading={revoking}
              onClick={() => {
                handleRevoke(invitation);
              }}
            >
              Revoke
            </Button>
          </li>
        );
      })}
    </ul>
  );
};

export default PendingInvitations;
