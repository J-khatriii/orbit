import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const MAX_ATTACHMENTS = 5;

// Uploads wait in a temporary folder until we've checked what they really are.
const storage = multer.diskStorage({
  destination: path.join(os.tmpdir(), "orbit-uploads"),
  filename: (req, file, callback) => {
    callback(null, randomUUID());
  },
});

const fileSize = env.MAX_UPLOAD_MB * 1024 * 1024;

const single = multer({
  storage,
  limits: { fileSize, files: 1, fields: 5 },
  defParamCharset: "utf8",
}).single("file");

const several = multer({
  storage,
  limits: { fileSize, files: MAX_ATTACHMENTS, fields: 10 },
  defParamCharset: "utf8",
}).array("files", MAX_ATTACHMENTS);

const toAppError = (error, tooManyMessage) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new AppError(413, "FILE_TOO_LARGE", `Files can be at most ${env.MAX_UPLOAD_MB} MB`);
    }

    return new AppError(400, "UPLOAD_INVALID", tooManyMessage);
  }

  return error;
};

const wrap = (middleware, tooManyMessage) => {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      next(error ? toAppError(error, tooManyMessage) : undefined);
    });
  };
};

// One file, in the "file" field.
export const uploadFile = wrap(single, 'Upload one file, in the "file" field');

// Up to MAX_ATTACHMENTS files, in the "files" field. A request without files (plain JSON)
// passes straight through.
export const uploadFiles = wrap(several, `You can attach up to ${MAX_ATTACHMENTS} files`);

// Put this after a router's routes. If anything failed after the files arrived (for example a
// field didn't validate), the waiting copies are deleted.
export const discardUpload = async (error, req, res, next) => {
  const waiting = [req.file, ...(req.files ?? [])].filter(Boolean);

  await Promise.all(
    waiting.map((upload) => {
      return rm(upload.path, { force: true });
    }),
  );

  next(error);
};
