import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const uploader = multer({
  // Uploads wait in a temporary folder until we've checked what they really are.
  storage: multer.diskStorage({
    destination: path.join(os.tmpdir(), "orbit-uploads"),
    filename: (req, file, callback) => {
      callback(null, randomUUID());
    },
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 5 },
  defParamCharset: "utf8",
}).single("file");

const toAppError = (error) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new AppError(413, "FILE_TOO_LARGE", `Files can be at most ${env.MAX_UPLOAD_MB} MB`);
    }

    return new AppError(400, "UPLOAD_INVALID", 'Upload one file, in the "file" field');
  }

  return error;
};

export const uploadFile = (req, res, next) => {
  uploader(req, res, (error) => {
    next(error ? toAppError(error) : undefined);
  });
};

// Put this after a router's routes. If anything failed after the file arrived (for example a
// field didn't validate), the waiting copy is deleted.
export const discardUpload = async (error, req, res, next) => {
  if (req.file) {
    await rm(req.file.path, { force: true });
  }

  next(error);
};
