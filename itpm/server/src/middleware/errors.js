export function notFound(_req, res) {
  res.status(404).json({ 
    message: "Resource not found",
    status: 404
  });
}

export function errorHandler(err, req, res, _next) {
  // Log error details
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    timestamp: new Date().toISOString()
  });

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: "Validation error", 
      errors: messages,
      status: 400
    });
  }

