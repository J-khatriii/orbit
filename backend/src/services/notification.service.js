import { db } from "../db/knex.js";
import * as notificationsRepository from "../repositories/notifications.repository.js";
import { toNotification } from "./serializers.js";

// Writes one notification per recipient. The person who caused it is never notified, and
// someone named twice only gets one. Pass the open transaction as `executor` so the
// notification and the change it's about succeed or fail together.
export const notify = async (
  executor,
  {
    workspaceId,
    actorId = null,
    userIds,
    kind,
    clientId = null,
    projectId = null,
    taskId = null,
    data = {},
  },
) => {
  const recipients = [...new Set(userIds)].filter((userId) => {
    return userId !== actorId;
  });

  await notificationsRepository.insertMany(
    executor,
    recipients.map((userId) => {
      return {
        workspace_id: workspaceId,
        user_id: userId,
        actor_id: actorId,
        kind,
        client_id: clientId,
        project_id: projectId,
        task_id: taskId,
        data,
      };
    }),
  );
};

export const listNotifications = async ({ workspaceId, userId, query }) => {
  const filters = { workspaceId, userId, unreadOnly: query.view === "unread" };
  const [rows, total, unread] = await Promise.all([
    notificationsRepository.list(db, {
      ...filters,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    notificationsRepository.count(db, filters),
    notificationsRepository.count(db, { workspaceId, userId, unreadOnly: true }),
  ]);

  return {
    notifications: rows.map((row) => {
      return toNotification(row);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
    unread,
  };
};

export const getUnreadCount = async ({ workspaceId, userId }) => {
  const unread = await notificationsRepository.count(db, { workspaceId, userId, unreadOnly: true });

  return { unread };
};

export const markRead = async ({ workspaceId, userId, input }) => {
  const updated = await notificationsRepository.markRead(db, {
    workspaceId,
    userId,
    ids: input.all ? undefined : input.ids,
  });
  const { unread } = await getUnreadCount({ workspaceId, userId });

  return { updated, unread };
};

// The team wrote to the client.
export const notifyTeamMessage = async (
  executor,
  { workspaceId, authorId, authorName, client },
) => {
  const userIds = await notificationsRepository.listClientUserIds(executor, {
    workspaceId,
    clientId: client.id,
  });

  await notify(executor, {
    workspaceId,
    actorId: authorId,
    userIds,
    kind: "message",
    clientId: client.id,
    data: { actorName: authorName, clientName: client.company_name },
  });
};

// A client wrote to the team.
export const notifyClientMessage = async (
  executor,
  { workspaceId, authorId, authorName, client },
) => {
  const userIds = await notificationsRepository.listTeamUserIds(executor, {
    workspaceId,
    clientId: client.id,
  });

  await notify(executor, {
    workspaceId,
    actorId: authorId,
    userIds,
    kind: "message",
    clientId: client.id,
    data: { actorName: authorName, clientName: client.company_name },
  });
};

// Call this after any change that might have put a shared task In review. It does nothing
// unless the task really is shared and waiting on the client.
export const notifyReviewRequested = async (executor, { workspaceId, actorId, project, task }) => {
  if (!task.client_visible || task.status !== "in_review") {
    return;
  }

  const userIds = await notificationsRepository.listClientUserIds(executor, {
    workspaceId,
    clientId: project.client_id,
  });

  await notify(executor, {
    workspaceId,
    actorId,
    userIds,
    kind: "review_requested",
    clientId: project.client_id,
    projectId: project.id,
    taskId: task.id,
    data: { projectName: project.name, taskTitle: task.title },
  });
};

// A client approved or asked for changes. The comment itself stays on the task.
export const notifyReviewDecided = async (
  executor,
  { workspaceId, actorId, project, task, decision },
) => {
  const userIds = await notificationsRepository.listTeamUserIds(executor, {
    workspaceId,
    clientId: project.client_id,
    projectId: project.id,
  });
  const actorName = await notificationsRepository.findUserName(executor, actorId);

  await notify(executor, {
    workspaceId,
    actorId,
    userIds,
    kind: "review_decided",
    clientId: project.client_id,
    projectId: project.id,
    taskId: task.id,
    data: { actorName, projectName: project.name, taskTitle: task.title, decision },
  });
};
