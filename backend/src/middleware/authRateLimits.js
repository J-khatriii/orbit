import { env } from "../config/env.js";
import { createRateLimiter } from "../lib/rateLimit.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// The automated tests make dozens of requests from one address, so they get a limit
// that never trips. The limiter itself is tested separately in rateLimit.test.js.
const limitFor = (realLimit) => {
  return env.NODE_ENV === "test" ? 100000 : realLimit;
};

export const loginLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: limitFor(10),
  skipSuccessfulRequests: true,
  message: "Too many failed sign-in attempts. Please wait a few minutes and try again.",
});

export const signupLimiter = createRateLimiter({
  windowMs: HOUR,
  limit: limitFor(10),
  message: "Too many sign-ups from this connection. Please try again later.",
});

export const emailLimiter = createRateLimiter({
  windowMs: HOUR,
  limit: limitFor(5),
  message: "We've sent a few emails already. Please check your inbox, or try again in an hour.",
});

export const tokenLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: limitFor(20),
  message: "Too many attempts. Please wait a few minutes and try again.",
});
