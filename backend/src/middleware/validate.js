import { AppError } from "../utils/AppError.js";

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!fields[key]) {
          fields[key] = issue.message;
        }
      }
      return next(
        new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", { fields }),
      );
    }

    req.validated = { ...req.validated, [source]: result.data };
    return next();
  };
};
