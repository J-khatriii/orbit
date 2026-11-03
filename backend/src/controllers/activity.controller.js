import * as activityService from "../services/activity.service.js";

export const listWorkspaceActivity = async (req, res) => {
  const result = await activityService.listWorkspaceActivity(req.workspace.id, req.validated.query);

  res.json(result);
};
