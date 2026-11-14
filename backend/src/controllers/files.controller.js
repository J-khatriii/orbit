import { once } from "node:events";
import { pipeline } from "node:stream/promises";
import { storage } from "../lib/storage.js";
import * as fileService from "../services/file.service.js";
import { AppError } from "../utils/AppError.js";

// A header-safe copy of the name for old browsers, plus the exact name in the modern form.
const disposition = (type, name) => {
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  });

  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

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
  const inline = req.query.inline === "1" && fileService.canPreview(row.content_type);
  const stream = storage.get(row.storage_key);

  // Wait until the file really opens, so a missing file is a clean 404 and not a broken
  // download with the headers already sent.
  try {
    await once(stream, "open");
  } catch {
    stream.destroy();
    throw new AppError(404, "FILE_NOT_FOUND", "File not found");
  }

  res.setHeader("Content-Type", row.content_type);
  res.setHeader("Content-Length", row.size_bytes);
  res.setHeader("Content-Disposition", disposition(inline ? "inline" : "attachment", row.name));
  res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

  try {
    await pipeline(stream, res);
  } catch {
    // The person closed the page mid-download. Nothing left to tell them.
    res.destroy();
  }
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
