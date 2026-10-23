import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Orbit API is running" });
});

app.use("/api", healthRoutes);

app.use(errorMiddleware);

export default app;
