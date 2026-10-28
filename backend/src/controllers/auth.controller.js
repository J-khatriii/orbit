import * as authService from "../services/auth.service.js";
import { destroySession } from "../services/session.service.js";
import { clearSessionCookie, SESSION_COOKIE_NAME, setSessionCookie } from "../lib/sessionCookie.js";

const getMeta = (req) => {
  return { userAgent: req.get("user-agent"), ipAddress: req.ip };
};

export const signup = async (req, res) => {
  const { session, ...account } = await authService.signup(req.validated.body, getMeta(req));

  setSessionCookie(res, session.token, session.expiresAt);
  res.status(201).json(account);
};

export const login = async (req, res) => {
  const { session, ...account } = await authService.login(req.validated.body, getMeta(req));

  setSessionCookie(res, session.token, session.expiresAt);
  res.json(account);
};

export const logout = async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (token) {
    await destroySession(token);
  }
  clearSessionCookie(res);
  res.status(204).end();
};

export const me = async (req, res) => {
  const account = await authService.getAccount(req.user);

  res.json(account);
};
