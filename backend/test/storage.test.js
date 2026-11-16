import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { storage } from "../src/lib/storage.js";

const newKey = () => {
  return `${randomUUID()}/${randomUUID()}`;
};

const readAll = async (stream) => {
  return Buffer.concat(await Array.fromAsync(stream));
};

describe("storage driver", () => {
  it("stores bytes and reads them back", async () => {
    const key = newKey();
    const bytes = Buffer.from("hello orbit");

    const result = await storage.put(key, Readable.from(bytes));
    const back = await readAll(storage.get(key));

    expect(result.size).toBe(bytes.length);
    expect(back.toString()).toBe("hello orbit");
  });

  it("removes a file, and removing it again is fine", async () => {
    const key = newKey();

    await storage.put(key, Readable.from(Buffer.from("temporary")));
    await storage.remove(key);
    await storage.remove(key);

    await expect(readAll(storage.get(key))).rejects.toThrow();
  });

  it("refuses keys that could point outside the storage folder", async () => {
    expect(() => {
      return storage.get("../../etc/passwd");
    }).toThrow();
    expect(() => {
      return storage.get(`${randomUUID()}/../${randomUUID()}`);
    }).toThrow();
    await expect(storage.put("../escape", Readable.from(Buffer.from("x")))).rejects.toThrow();
    await expect(storage.remove("not-a-key")).rejects.toThrow();
  });
});
