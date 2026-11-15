import * as portalService from "../services/portal.service.js";
import { sendStoredFile } from "./sendStoredFile.js";

export const listProjects = async (req, res) => {
  const result = await portalService.listProjects({
    workspaceId: req.workspace.id,
    userId: req.user.id,
  });

  res.json(result);
};

export const getProject = async (req, res) => {
  const result = await portalService.getProject({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
  });

  res.json(result);
};

export const listClients = async (req, res) => {
  const result = await portalService.listClients({
    workspaceId: req.workspace.id,
    userId: req.user.id,
  });

  res.json(result);
};

export const listClientMessages = async (req, res) => {
  const result = await portalService.listClientMessages({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    clientId: req.params.clientId,
    query: req.validated.query,
  });

  res.json(result);
};

export const createClientMessage = async (req, res) => {
  const result = await portalService.createClientMessage({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    clientId: req.params.clientId,
    input: req.validated.body,
    uploads: req.files ?? [],
  });

  res.status(201).json(result);
};

export const listFiles = async (req, res) => {
  const result = await portalService.listFiles({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    query: req.validated.query,
  });

  res.json(result);
};

export const downloadFile = async (req, res) => {
  const row = await portalService.getFile({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    fileId: req.params.fileId,
  });

  await sendStoredFile(req, res, row);
};
