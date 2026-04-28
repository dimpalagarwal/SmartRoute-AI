const cors = require("cors");
const { ALLOWED_ORIGINS } = require("../config");

const corsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

module.exports = {
  corsMiddleware: cors(corsOptions),
  // Pre-flight handler for all routes
  corsPreFlight: cors(),
};
