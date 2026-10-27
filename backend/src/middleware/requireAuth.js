import { clearSessionCookie, SESSION_COOKIE_NAME } from "../lib/sessionCookie.js";
import { findSession } from "../services/session.service.js";
import { AppError } from "../utils/AppError.js";

// Put this in front of any route that needs a signed-in user
// On success: req.user (the user row), req.sessionToken
export const requireAuth = async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue");
  }

  const row = await findSession(token);

  if (!row) {
    clearSessionCookie(res);
    throw new AppError(401, "UNAUTHENTICATED", "Your session has expired, please sign in again");
  }

  req.user = row;
  req.sessionToken = token;

  return next();
};
