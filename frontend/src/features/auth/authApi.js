import { api } from "../../lib/api.js";

export const authApi = {
  me: () => {
    return api.get("/auth/me");
  },
  login: ({ email, password }) => {
    return api.post("/auth/login", { email, password });
  },
  signup: ({ name, email, password, workspaceName }) => {
    return api.post("/auth/signup", { name, email, password, workspaceName });
  },
  logout: () => {
    return api.post("/auth/logout");
  },
  verifyEmail: (token) => {
    return api.post("/auth/verify-email", { token });
  },
  resendVerification: () => {
    return api.post("/auth/resend-verification");
  },
  forgotPassword: (email) => {
    return api.post("/auth/forgot-password", { email });
  },
  resetPassword: ({ token, password }) => {
    return api.post("/auth/reset-password", { token, password });
  },
  previewInvitation: (token) => {
    return api.post("/invitations/preview", { token });
  },
  acceptInvitation: ({ token, name, password }) => {
    return api.post("/invitations/accept", { token, name, password });
  },
};
