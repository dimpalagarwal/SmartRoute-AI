const express = require("express");
const { analyzeTrafficRisk, listModels } = require("../services/geminiService");

const router = express.Router();

/**
 * POST /ai-risk
 * Analyzes traffic risk using Gemini AI given traffic, weather, and time context.
 */
router.post("/ai-risk", async (req, res) => {
  console.log("🔥 AI ROUTE HIT");
  const { traffic, weather, time } = req.body;

  try {
    const result = await analyzeTrafficRisk(traffic, weather, time);
    res.json(result);
  } catch (err) {
    console.error("Gemini Error:", err.response?.data || err.message);
    res.json({ risk: "Low", reasons: ["AI unavailable"] });
  }
});

/**
 * GET /list-models
 * Lists available Gemini AI models.
 */
router.get("/list-models", async (req, res) => {
  console.log("📡 Listing models...");
  try {
    const data = await listModels();
    res.json(data);
  } catch (err) {
    console.error("Model fetch error:", err.response?.data || err.message);
    res.status(500).send("Error fetching models");
  }
});

module.exports = router;
