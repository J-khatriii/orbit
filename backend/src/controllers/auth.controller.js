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

// Safe to call when already signed out: it just clears whatever is there
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

export const verifyEmail = async (req, res) => {
  await authService.verifyEmail(req.validated.body.token);

  res.json({ emailVerified: true });
};

export const resendVerification = async (req, res) => {
  await authService.resendVerification(req.user);

  res.status(204).end();
};

export const forgotPassword = async (req, res) => {
  await authService.requestPasswordReset(req.validated.body);

  res
    .status(202)
    .json({ message: "If an account exists for that email, a reset link is on its way." });
};

export const resetPassword = async (req, res) => {
  await authService.resetPassword(req.validated.body);

  res.status(204).end();
};
