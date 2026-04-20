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

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ 
      message: `${field} already exists`,
      status: 409
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      message: "Invalid token",
      status: 401
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      message: "Token expired",
      status: 401
    });
  }

  // Default server error
  res.status(err.status || 500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? "Internal server error" 
      : err.message,
    status: err.status || 500
  });
}
