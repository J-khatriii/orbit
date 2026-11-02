import { useState } from "react";
import { Avatar, Badge, Button, Modal, Spinner, useToast } from "../ui/index.js";
import { ROLE_LABELS } from "../../features/auth/roles.js";
import { canManageMember, manageableRoles } from "../../features/team/permissions.js";
import { useChangeMemberRole, useRemoveMember } from "../../features/team/useTeam.js";

const MembersList = ({ workspaceId, myRole, currentUserId, members, isPending, error }) => {
  const toast = useToast();
  const changeRole = useChangeMemberRole();
  const removeMember = useRemoveMember();
  const [removing, setRemoving] = useState(null);

  const handleRoleChange = (member, role) => {
    changeRole.mutate(
      { workspaceId, userId: member.userId, role },
      {
        onSuccess: () => {
          toast.show(`${member.name} is now ${ROLE_LABELS[role]}.`);
        },
        onError: (changeError) => {
          toast.show(changeError.message);
        },
      },
    );
  };

  const confirmRemove = () => {
    removeMember.mutate(
      { workspaceId, userId: removing.userId },
      {
        onSuccess: () => {
          toast.show(`${removing.name} was removed.`);
          setRemoving(null);
        },
        onError: (removeError) => {
          toast.show(removeError.message);
          setRemoving(null);
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

  return (
    <>
      <ul className="divide-y divide-line">
        {members.map((member) => {
          const manageable = canManageMember({ myRole, myId: currentUserId, member });
          const changing = changeRole.isPending && changeRole.variables?.userId === member.userId;

          return (
            <li key={member.userId} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={member.name} />
              <div className="min-w-40 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {member.name}
                  {member.userId === currentUserId && (
                    <span className="ml-2 text-xs font-normal text-ink-muted">You</span>
                  )}
                </p>
                <p className="truncate text-sm text-ink-soft">{member.email}</p>
              </div>
              {member.status !== "active" && <Badge tone="clay">{member.status}</Badge>}
              {manageable ? (
                <div className="ml-auto flex items-center gap-2">
                  <select
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    disabled={changing}
                    onChange={(event) => {
                      handleRoleChange(member, event.target.value);
                    }}
                    className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
                  >
                    {manageableRoles(myRole).map((role) => {
                      return (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      );
                    })}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRemoving(member);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Badge tone={member.role === "owner" ? "brand" : "neutral"}>
                  {ROLE_LABELS[member.role] ?? member.role}
                </Badge>
              )}
            </li>
          );
        })}
      </ul>

      <Modal
        open={Boolean(removing)}
        onClose={() => {
          setRemoving(null);
        }}
        title={`Remove ${removing?.name ?? ""}?`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRemoving(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={removeMember.isPending} onClick={confirmRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          They lose access to this workspace straight away. Their account stays, and you can invite
          them again later.
        </p>
      </Modal>
    </>
  );
};

export default MembersList;
