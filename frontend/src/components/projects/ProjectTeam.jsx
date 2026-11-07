import { useState } from "react";
import { Avatar, Badge, Button, Card, useToast } from "../ui/index.js";
import { useMembers } from "../../features/team/useTeam.js";
import {
  useAddProjectMember,
  useRemoveProjectMember,
} from "../../features/projects/useProjectMutations.js";

const controlClass =
  "rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

const ProjectTeam = ({ workspaceId, project }) => {
  const toast = useToast();
  const members = useMembers(workspaceId);
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("member");

  // People who can be added: active, work in this workspace (not portal clients), and not
  // already on this project.
  const assigned = new Set(
    project.members.map((member) => {
      return member.userId;
    }),
  );
  const candidates = (members.data ?? []).filter((member) => {
    return member.status === "active" && member.role !== "client" && !assigned.has(member.userId);
  });
  const removingId = removeMember.isPending ? removeMember.variables.userId : null;

  const handleAdd = (event) => {
    event.preventDefault();

    if (!userId) {
      return;
    }

    const person = candidates.find((member) => {
      return member.userId === userId;
    });

    addMember.mutate(
      { workspaceId, projectId: project.id, input: { userId, role } },
      {
        onSuccess: () => {
          setUserId("");
          setRole("member");
          toast.show(`${person?.name ?? "Teammate"} was added to the project.`);
        },
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  const handleRemove = (member) => {
    removeMember.mutate(
      { workspaceId, projectId: project.id, userId: member.userId },
      {
        onSuccess: () => {
          toast.show(`${member.name} was removed from the project.`);
        },
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  return (
    <Card title="Team">
      {project.members.length === 0 ? (
        <p className="text-sm text-ink-soft">Nobody is assigned yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {project.members.map((member) => {
            return (
              <li key={member.userId} className="flex items-center gap-3 py-3">
                <Avatar name={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                  <p className="truncate text-sm text-ink-soft">{member.email}</p>
                </div>
                <Badge tone={member.role === "lead" ? "brand" : "neutral"}>
                  {member.role === "lead" ? "Lead" : "Member"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={removingId === member.userId}
                  aria-label={`Remove ${member.name} from the project`}
                  onClick={() => {
                    handleRemove(member);
                  }}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={handleAdd}
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4"
      >
        <select
          aria-label="Person to add"
          value={userId}
          disabled={members.isPending || candidates.length === 0}
          onChange={(event) => {
            setUserId(event.target.value);
          }}
          className={`${controlClass} min-w-48 flex-1`}
        >
          <option value="">
            {members.isPending
              ? "Loading…"
              : candidates.length === 0
                ? "Everyone is already on this team"
                : "Add a person…"}
          </option>
          {candidates.map((member) => {
            return (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            );
          })}
        </select>
        <select
          aria-label="Their role on this project"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
          }}
          className={controlClass}
        >
          <option value="member">Member</option>
          <option value="lead">Lead</option>
        </select>
        <Button type="submit" variant="secondary" loading={addMember.isPending} disabled={!userId}>
          Add
        </Button>
      </form>
    </Card>
  );
};

export default ProjectTeam;
