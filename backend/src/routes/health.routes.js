import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Orbit API is healthy",
    service: "orbit-server",
    time: new Date().toISOString(),
  });
});

export default router;
