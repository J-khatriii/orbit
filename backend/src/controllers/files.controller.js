import * as fileService from "../services/file.service.js";
import { sendStoredFile } from "./sendStoredFile.js";

export const listFiles = async (req, res) => {
  const result = await fileService.listFiles({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    query: req.validated.query,
  });

  res.json(result);
};

export const uploadFile = async (req, res) => {
  const result = await fileService.uploadFile({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    clientId: req.params.clientId,
    upload: req.file,
    input: req.validated.body,
  });

  res.status(201).json(result);
};

export const downloadFile = async (req, res) => {
  const row = await fileService.getFile({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    fileId: req.params.fileId,
  });

  await sendStoredFile(req, res, row);
};

export const updateFile = async (req, res) => {
  const result = await fileService.updateFile({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    fileId: req.params.fileId,
    input: req.validated.body,
  });

  res.json(result);
};

export const deleteFile = async (req, res) => {
  await fileService.deleteFile({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    fileId: req.params.fileId,
  });

  res.status(204).end();
};
