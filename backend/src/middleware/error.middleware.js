const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: "error",
    message: statusCode === 500 ? "Internal server error" : err.message,
  });
};

export default errorMiddleware;
