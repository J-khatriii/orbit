import { SESSION_COOKIE_NAME } from "../lib/sessionCookie.js";
import { findSession } from "../services/session.service.js";

// Like requireAuth, but never rejects. If there is a valid session, req.user is set;
// otherwise the request carries on anonymously.
export const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (token) {
    const row = await findSession(token);

    if (row) {
      req.user = row;
      req.sessionToken = token;
    }
  }

  return next();
};
