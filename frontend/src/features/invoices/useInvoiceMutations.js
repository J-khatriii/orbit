import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "./invoicesApi.js";
import { invoicesKey } from "./useInvoices.js";

const useRefresh = () => {
  const queryClient = useQueryClient();

  return (variables) => {
    return queryClient.invalidateQueries({ queryKey: invoicesKey(variables.workspaceId) });
  };
};

export const useCreateInvoice = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};

export const useUpdateInvoice = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: invoicesApi.update,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};

export const useSendInvoice = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: invoicesApi.send,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};

export const useVoidInvoice = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: invoicesApi.markVoid,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};

export const useDeleteInvoice = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: invoicesApi.remove,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};

export const useEmailInvoice = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: invoicesApi.email,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};
