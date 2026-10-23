import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Orbit API is healthy",
  });
});

export default router;
