import { env } from "../config/env.js";

export const SESSION_COOKIE_NAME = "orbit_session";

const baseOptions = () => {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  };
};

export const setSessionCookie = (res, token, expiresAt) => {
  res.cookie(SESSION_COOKIE_NAME, token, { ...baseOptions(), expires: expiresAt });
};

export const clearSessionCookie = (res) => {
  res.clearCookie(SESSION_COOKIE_NAME, baseOptions());
};
