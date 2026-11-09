import * as templateService from "../services/template.service.js";

export const listTemplates = async (req, res) => {
  const result = await templateService.listTemplates(req.workspace.id);

  res.json(result);
};

export const getTemplate = async (req, res) => {
  const template = await templateService.getTemplate(req.workspace.id, req.params.templateId);

  res.json({ template });
};

export const createTemplate = async (req, res) => {
  const template = await templateService.createTemplate({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    input: req.validated.body,
  });

  res.status(201).json({ template });
};

export const updateTemplate = async (req, res) => {
  const template = await templateService.updateTemplate({
    workspaceId: req.workspace.id,
    templateId: req.params.templateId,
    input: req.validated.body,
  });

  res.json({ template });
};

export const deleteTemplate = async (req, res) => {
  await templateService.deleteTemplate({
    workspaceId: req.workspace.id,
    templateId: req.params.templateId,
  });

  res.status(204).end();
};
