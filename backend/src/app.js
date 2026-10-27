import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";

const app = express();

// Disable the X-Powered-By header
app.disable("x-powered-by");

// Apply request logging, security headers, and JSON parsing
app.use(requestLogger);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Register API routes
app.use(routes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({ message: "Orbit API is running" });
});

// Handle unknown routes and application errors
app.use(notFound);
app.use(errorHandler);

export default app;
