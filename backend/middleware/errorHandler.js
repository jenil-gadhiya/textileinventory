export const errorHandler = (err, req, res, next) => {
  console.error("Error Handler:", err);

  let status = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Server Error";

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    status = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    message = `Validation Error: ${errors.join(", ")}`;
  }

  // Handle Mongoose cast errors
  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  res.status(status).json({
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
};



