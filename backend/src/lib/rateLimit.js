import { rateLimit } from "express-rate-limit";

// Builds a limiter that answers in Orbit's usual error shape.
//   windowMs                 how long the counting window is
//   limit                    how many requests one address may make in that window
//   skipSuccessfulRequests   count only failures (good for login)
export const createRateLimiter = ({ windowMs, limit, message, skipSuccessfulRequests = false }) => {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: { code: "RATE_LIMITED", message } });
    },
  });
};
