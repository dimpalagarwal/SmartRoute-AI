require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5001,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  TOMTOM_API_KEY: process.env.TOMTOM_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || "4473613b70aa7c0e9f28baa5a5889ffe",
  ALLOWED_ORIGINS: ["http://localhost:5173", "http://localhost:5001"],
};
