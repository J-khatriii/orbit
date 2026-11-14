import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, rm } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromFile } from "file-type";
import { db } from "../db/knex.js";
import { storage } from "../lib/storage.js";
import * as filesRepository from "../repositories/files.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { toFile } from "./serializers.js";

// What a file really is, read from its bytes. Anything not listed here is refused. SVG and
// HTML are left out on purpose: they can carry scripts.
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

// Plain text has no signature to read, so it's accepted by its extension, after checking the
// content has no binary bytes.
const TEXT_TYPES = { ".txt": "text/plain", ".csv": "text/csv" };

// The only types a browser may show inline. Everything else is always a download.
const PREVIEW_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export const canPreview = (contentType) => {
  return PREVIEW_TYPES.has(contentType);
};

// A name that's safe to show and to put in a download header.
const cleanName = (value) => {
  const base = String(value)
    .split(/[\\/]/)
    .pop()
    .replace(/\p{Cc}/gu, "")
    .trim();

  return base.slice(0, 200) || "file";
};

const detectType = async (filePath, name) => {
  const found = await fileTypeFromFile(filePath);

  if (found) {
    return ALLOWED_TYPES.has(found.mime) ? found.mime : null;
  }

  const textType = TEXT_TYPES[path.extname(name).toLowerCase()];

  if (!textType) {
    return null;
  }

  const handle = await open(filePath, "r");

  try {
    const { bytesRead, buffer } = await handle.read(Buffer.alloc(8192), 0, 8192, 0);

    return buffer.subarray(0, bytesRead).includes(0) ? null : textType;
  } finally {
    await handle.close();
  }
};

const loadClient = async (executor, workspaceId, clientId) => {
  const row = isUuid(clientId)
    ? await filesRepository.findClient(executor, { workspaceId, clientId })
    : undefined;

  if (!row) {
    throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
  }

  return row;
};

const loadFile = async (executor, workspaceId, clientId, fileId) => {
  const row = isUuid(fileId)
    ? await filesRepository.findById(executor, { workspaceId, clientId, id: fileId })
    : undefined;

  if (!row) {
    throw new AppError(404, "FILE_NOT_FOUND", "File not found");
  }

  return row;
};

// A file can only be tagged with one of this client's own projects.
const ensureProjectBelongs = async (executor, workspaceId, clientId, projectId) => {
  const project = await filesRepository.findProject(executor, { workspaceId, projectId });

  if (!project || project.client_id !== clientId) {
    throw new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields", {
      fields: { projectId: "Choose one of this client's projects" },
    });
  }
};

export const listFiles = async ({ workspaceId, clientId, query }) => {
  const client = await loadClient(db, workspaceId, clientId);
  const filters = { workspaceId, clientId: client.id, projectId: query.projectId };
  const [rows, total] = await Promise.all([
    filesRepository.list(db, {
      ...filters,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    filesRepository.count(db, filters),
  ]);

  return {
    files: rows.map((row) => {
      return toFile(row);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

// `upload` is what the upload middleware left on the request: the temporary path, the
// original name and the size. The temporary copy is always removed at the end.
export const uploadFile = async ({ workspaceId, userId, clientId, upload, input }) => {
  if (!upload) {
    throw new AppError(400, "FILE_REQUIRED", "Choose a file to upload");
  }

  try {
    const client = await loadClient(db, workspaceId, clientId);

    if (input.projectId) {
      await ensureProjectBelongs(db, workspaceId, client.id, input.projectId);
    }
    if (upload.size === 0) {
      throw new AppError(400, "EMPTY_FILE", "That file is empty");
    }

    const name = cleanName(upload.originalname);
    const contentType = await detectType(upload.path, name);

    if (!contentType) {
      throw new AppError(
        415,
        "UNSUPPORTED_FILE_TYPE",
        "This type of file isn't allowed. Use images, PDFs, Word, Excel or PowerPoint files, text, CSV or ZIP.",
      );
    }

    const id = randomUUID();
    const key = `${workspaceId}/${id}`;

    await storage.put(key, createReadStream(upload.path));

    try {
      await filesRepository.insert(db, {
        id,
        workspace_id: workspaceId,
        client_id: client.id,
        project_id: input.projectId ?? null,
        uploaded_by: userId,
        name,
        content_type: contentType,
        size_bytes: upload.size,
        storage_key: key,
        client_visible: input.clientVisible,
      });
    } catch (error) {
      // No row, so the stored bytes would be orphaned.
      await storage.remove(key);
      throw error;
    }

    const row = await filesRepository.findById(db, {
      workspaceId,
      clientId: client.id,
      id,
    });

    return { file: toFile(row) };
  } finally {
    await rm(upload.path, { force: true });
  }
};

// The database row, including where the bytes are. For the download route only.
export const getFile = async ({ workspaceId, clientId, fileId }) => {
  const client = await loadClient(db, workspaceId, clientId);

  return loadFile(db, workspaceId, client.id, fileId);
};

export const updateFile = async ({ workspaceId, clientId, fileId, input }) => {
  const client = await loadClient(db, workspaceId, clientId);
  const row = await loadFile(db, workspaceId, client.id, fileId);
  const columns = {};

  if (input.projectId) {
    await ensureProjectBelongs(db, workspaceId, client.id, input.projectId);
  }
  if (input.name !== undefined) {
    columns.name = cleanName(input.name);
  }
  if (input.clientVisible !== undefined) {
    columns.client_visible = input.clientVisible;
  }
  if (input.projectId !== undefined) {
    columns.project_id = input.projectId;
  }

  await filesRepository.update(db, { workspaceId, id: row.id, columns });

  const updated = await loadFile(db, workspaceId, client.id, row.id);

  return { file: toFile(updated) };
};

export const deleteFile = async ({ workspaceId, clientId, fileId }) => {
  const client = await loadClient(db, workspaceId, clientId);
  const row = await loadFile(db, workspaceId, client.id, fileId);

  await filesRepository.remove(db, { workspaceId, id: row.id });
  await storage.remove(row.storage_key);
};
