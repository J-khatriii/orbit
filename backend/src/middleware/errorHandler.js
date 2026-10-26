import { AppError } from "../utils/AppError.js";

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";
  let details;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request body is not valid JSON";
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request body is too large";
  }

  if (statusCode >= 500) {
    req.log.error({ err }, "Unhandled error");
  }

  res.status(statusCode).json({
    error: { code, message, ...(details && { details }) },
  });
};
