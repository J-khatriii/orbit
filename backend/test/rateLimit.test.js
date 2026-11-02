import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/lib/rateLimit.js";

// A tiny app with one route. `?fail=1` makes it answer 401, like a wrong password.
const buildApp = (options) => {
  const app = express();

  app.post("/try", createRateLimiter(options), (req, res) => {
    res.status(req.query.fail ? 401 : 200).json({ ok: !req.query.fail });
  });

  return app;
};

describe("rate limiter", () => {
  it("lets requests through up to the limit, then answers 429 in Orbit's error shape", async () => {
    const app = buildApp({ windowMs: 60000, limit: 3, message: "Slow down" });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await request(app).post("/try")).status).toBe(200);
    }

    const blocked = await request(app).post("/try");

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: { code: "RATE_LIMITED", message: "Slow down" } });
  });

  it("can count failures only, so normal use is never blocked", async () => {
    const app = buildApp({
      windowMs: 60000,
      limit: 2,
      skipSuccessfulRequests: true,
      message: "Slow down",
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await request(app).post("/try")).status).toBe(200);
    }

    expect((await request(app).post("/try?fail=1")).status).toBe(401);
    expect((await request(app).post("/try?fail=1")).status).toBe(401);
    expect((await request(app).post("/try?fail=1")).status).toBe(429);
  });
});
