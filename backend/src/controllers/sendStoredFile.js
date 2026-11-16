import { once } from "node:events";
import { pipeline } from "node:stream/promises";
import { storage } from "../lib/storage.js";
import { canPreview } from "../services/file.service.js";
import { AppError } from "../utils/AppError.js";

// A header-safe copy of the name for old browsers, plus the exact name in the modern form.
const disposition = (type, name) => {
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  });

  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

// Sends the stored bytes of a file row. The caller has already checked who may have it.
export const sendStoredFile = async (req, res, row) => {
  const inline = req.query.inline === "1" && canPreview(row.content_type);
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
  // The browser must trust the type we send and never guess a different one.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", disposition(inline ? "inline" : "attachment", row.name));
  // Previews and thumbnails may be reused for a few minutes. Downloads are always fresh.
  res.setHeader(
    "Cache-Control",
    inline ? "private, max-age=300" : "private, max-age=0, must-revalidate",
  );

  try {
    await pipeline(stream, res);
  } catch {
    // The person closed the page mid-download. Nothing left to tell them.
    res.destroy();
  }
};
