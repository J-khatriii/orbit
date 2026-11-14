import * as notificationService from "../services/notification.service.js";

export const listNotifications = async (req, res) => {
  const result = await notificationService.listNotifications({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    query: req.validated.query,
  });

  res.json(result);
};

export const getUnreadCount = async (req, res) => {
  const result = await notificationService.getUnreadCount({
    workspaceId: req.workspace.id,
    userId: req.user.id,
  });

  res.json(result);
};

export const markRead = async (req, res) => {
  const result = await notificationService.markRead({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    input: req.validated.body,
  });

  res.json(result);
};
