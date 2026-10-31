import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./authApi.js";
import { ME_QUERY_KEY } from "./queryKeys.js";

// These stay: they don't belong to any one person.
const KEEP = new Set(["auth", "health"]);

// Whatever else is cached belonged to the previous person (or nobody), so it goes.
const forgetTenantData = (queryClient) => {
  queryClient.removeQueries({
    predicate: (query) => {
      return !KEEP.has(query.queryKey[0]);
    },
  });
};

// After login, signup or accepting an invitation, the server returns { user, workspaces }.
// We put that straight into the cache, so no second request is needed.
const useRememberAccount = () => {
  const queryClient = useQueryClient();

  return (account) => {
    forgetTenantData(queryClient);
    queryClient.setQueryData(ME_QUERY_KEY, {
      user: account.user,
      workspaces: account.workspaces,
    });
  };
};

export const useLogin = () => {
  const rememberAccount = useRememberAccount();

  return useMutation({ mutationFn: authApi.login, onSuccess: rememberAccount });
};

export const useSignup = () => {
  const rememberAccount = useRememberAccount();

  return useMutation({ mutationFn: authApi.signup, onSuccess: rememberAccount });
};

export const useAcceptInvitation = () => {
  const rememberAccount = useRememberAccount();

  return useMutation({ mutationFn: authApi.acceptInvitation, onSuccess: rememberAccount });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      forgetTenantData(queryClient);
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: ({ email }) => {
      return authApi.forgotPassword(email);
    },
  });
};

export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.resetPassword,
    // The server signs this person out everywhere, including this browser.
    onSuccess: () => {
      forgetTenantData(queryClient);
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });
};

export const useVerifyEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyEmail,
    // If this person is signed in here, refresh "who am I" so the reminder banner goes away.
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
};

export const useResendVerification = () => {
  return useMutation({ mutationFn: authApi.resendVerification });
};
