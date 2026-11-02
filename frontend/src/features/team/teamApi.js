import { api } from "../../lib/api.js";

export const teamApi = {
  members: (workspaceId) => {
    return api.get(`/workspaces/${workspaceId}/members`);
  },
  invitations: (workspaceId) => {
    return api.get(`/workspaces/${workspaceId}/invitations`);
  },
  invite: ({ workspaceId, email, role }) => {
    return api.post(`/workspaces/${workspaceId}/invitations`, { email, role });
  },
  revoke: ({ workspaceId, invitationId }) => {
    return api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`);
  },
  changeRole: ({ workspaceId, userId, role }) => {
    return api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
  },
  removeMember: ({ workspaceId, userId }) => {
    return api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },
};
