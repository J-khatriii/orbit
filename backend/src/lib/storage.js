import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { env } from "../config/env.js";

// Tests write to a throwaway folder so they never touch real files.
const root = path.resolve(
  env.NODE_ENV === "test" ? path.join(os.tmpdir(), "orbit-test-storage") : env.STORAGE_DIR,
);

// "<workspace id>/<file id>", both made by us. Nothing a person typed is ever part of a key.
const KEY_PATTERN = /^[0-9a-f-]{36}\/[0-9a-f-]{36}$/;

const pathFor = (key) => {
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Invalid storage key");
  }

  return path.join(root, key);
};

export const storage = {
  // Writes the stream to the key. Returns how many bytes were stored.
  put: async (key, stream) => {
    const file = pathFor(key);

    await mkdir(path.dirname(file), { recursive: true });
    await pipeline(stream, createWriteStream(file));

    const info = await stat(file);

    return { size: info.size };
  },

  // A readable stream. A missing file shows up as an "error" event on the stream.
  get: (key) => {
    return createReadStream(pathFor(key));
  },

  // Removing something that isn't there is fine.
  remove: async (key) => {
    await rm(pathFor(key), { force: true });
  },
};
