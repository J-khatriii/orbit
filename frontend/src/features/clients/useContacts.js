import { useQuery } from "@tanstack/react-query";
import { contactsApi } from "./contactsApi.js";
import { clientsKey } from "./useClients.js";

export const useContacts = (workspaceId, clientId) => {
  return useQuery({
    queryKey: [...clientsKey(workspaceId), "contacts", clientId],
    queryFn: () => {
      return contactsApi.list(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId),
    select: (data) => {
      return data.contacts;
    },
  });
};
