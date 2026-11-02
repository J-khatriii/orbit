import InviteForm from "../components/team/InviteForm.jsx";
import MembersList from "../components/team/MembersList.jsx";
import PendingInvitations from "../components/team/PendingInvitations.jsx";
import { Card } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { useInvitations, useMembers } from "../features/team/useTeam.js";

const TeamPage = () => {
  const { user, activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;

  const canSeeTeam = role !== "client";
  const canInvite = role === "owner" || role === "admin";

  const members = useMembers(workspaceId, canSeeTeam);
  const invitations = useInvitations(workspaceId, canInvite);

  if (!canSeeTeam) {
    return (
      <Card title="Team">
        <p className="text-sm text-ink-soft">
          The team list is only available to people who work in this workspace.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card title="Team members">
        <MembersList
          members={members.data ?? []}
          isPending={members.isPending}
          error={members.error}
          currentUserId={user.id}
        />
      </Card>

      {canInvite && (
        <>
          <Card title="Invite someone">
            <InviteForm workspaceId={workspaceId} myRole={role} />
          </Card>
          <Card title="Pending invitations">
            <PendingInvitations
              workspaceId={workspaceId}
              invitations={invitations.data ?? []}
              isPending={invitations.isPending}
              error={invitations.error}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default TeamPage;
