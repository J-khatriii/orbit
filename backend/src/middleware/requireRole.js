import { AppError } from "../utils/AppError.js";

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.membership?.role)) {
      throw new AppError(403, "FORBIDDEN", "You don't have permission to do that");
    }

    return next();
  };
};
