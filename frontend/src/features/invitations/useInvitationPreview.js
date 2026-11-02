import { useQuery } from "@tanstack/react-query";
import { authApi } from "../auth/authApi.js";

// Asks the server who an invitation link is for. The key starts with "auth" so signing in
// or out in the middle of accepting doesn't throw the answer away.
export const useInvitationPreview = (token) => {
  return useQuery({
    queryKey: ["auth", "invitation", token],
    queryFn: () => {
      return authApi.previewInvitation(token);
    },
    enabled: Boolean(token),
    select: (data) => {
      return data.invitation;
    },
  });
};
