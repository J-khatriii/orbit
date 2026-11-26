import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import { handleStripeWebhook } from "./controllers/stripeWebhook.controller.js";

const app = express();

// Disable the X-Powered-By header
app.disable("x-powered-by");

// Apply request logging, security headers, and JSON parsing
app.use(requestLogger);
app.use(helmet());
// Stripe signs the exact bytes it sends, so this route reads the raw body. It must come
// before express.json(), which would change them.
app.post(
  "/api/v1/webhooks/stripe",
  express.raw({ type: "application/json", limit: "1mb" }),
  handleStripeWebhook,
);
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
