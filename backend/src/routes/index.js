import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";

const router = Router();
const v1 = Router();

// Infrastructure checks live at the root (uptime monitors, Docker, hosting)
router.use("/health", healthRoutes);

// Everything the frontend calls lives under /api/v1
v1.use("/health", healthRoutes);
v1.use("/auth", authRoutes);
router.use("/api/v1", v1);

export default router;
