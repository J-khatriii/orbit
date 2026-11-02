import { Avatar, Badge, Spinner } from "../ui/index.js";
import { ROLE_LABELS } from "../../features/auth/roles.js";

const MembersList = ({ members, isPending, error, currentUserId }) => {
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
    <ul className="divide-y divide-line">
      {members.map((member) => {
        return (
          <li key={member.userId} className="flex items-center gap-3 py-3">
            <Avatar name={member.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {member.name}
                {member.userId === currentUserId && (
                  <span className="ml-2 text-xs font-normal text-ink-muted">You</span>
                )}
              </p>
              <p className="truncate text-sm text-ink-soft">{member.email}</p>
            </div>
            {member.status !== "active" && <Badge tone="clay">{member.status}</Badge>}
            <Badge tone={member.role === "owner" ? "brand" : "neutral"}>
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
};

export default MembersList;
