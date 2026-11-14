const DECISION_WORDS = {
  approved: "approved",
  changes_requested: "asked for changes on",
};

// What to say, and where to go. The words depend on who's reading: a client or the team.
export const describeNotification = (notification, role) => {
  const { kind, clientId, projectId, taskId, data } = notification;
  const isClient = role === "client";
  const actor = data.actorName ?? "Someone";

  if (kind === "message") {
    return {
      text: isClient
        ? `${actor} sent you a message`
        : `${actor} wrote in ${data.clientName}'s conversation`,
      to: isClient ? "/portal/messages" : `/clients/${clientId}?tab=messages`,
    };
  }

  if (kind === "review_requested") {
    return {
      text: `Your review is needed: ${data.taskTitle} (${data.projectName})`,
      to: isClient
        ? `/portal/projects/${projectId}`
        : `/projects/${projectId}?tab=tasks&task=${taskId}`,
    };
  }

  if (kind === "review_decided") {
    return {
      text: `${actor} ${DECISION_WORDS[data.decision] ?? "reviewed"} ${data.taskTitle} (${data.projectName})`,
      to: isClient
        ? `/portal/projects/${projectId}`
        : `/projects/${projectId}?tab=tasks&task=${taskId}`,
    };
  }

  return { text: "Something new happened", to: "/" };
};
