import { Router } from "express";
import { db } from "../db/knex.js";
import { AppError } from "../utils/AppError.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "orbit-server",
    time: new Date().toISOString(),
  });
});

router.get("/db", async (req, res) => {
  try {
    await db.raw("select 1");
  } catch (err) {
    req.log.error({ err }, "Database health check failed");
    throw new AppError(503, "DB_UNAVAILABLE", "Database is not reachable");
  }
  res.json({ status: "ok", database: "up" });
});

export default router;
