import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamApi } from "./teamApi.js";

// Keys start with "workspaces" and include the workspace id, so switching workspace
// never shows another workspace's people, and signing out clears them.
const membersKey = (workspaceId) => {
  return ["workspaces", workspaceId, "members"];
};

const invitationsKey = (workspaceId) => {
  return ["workspaces", workspaceId, "invitations"];
};

export const useMembers = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: membersKey(workspaceId),
    queryFn: () => {
      return teamApi.members(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.members;
    },
  });
};

export const useInvitations = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: invitationsKey(workspaceId),
    queryFn: () => {
      return teamApi.invitations(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.invitations;
    },
  });
};

export const useInviteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: teamApi.invite,
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({ queryKey: invitationsKey(variables.workspaceId) });
    },
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: teamApi.revoke,
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({ queryKey: invitationsKey(variables.workspaceId) });
    },
  });
};
