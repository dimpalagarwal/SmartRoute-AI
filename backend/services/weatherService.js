const axios = require("axios");
const { OPENWEATHER_API_KEY } = require("../config");

/**
 * Fetches current weather for a lat/lng coordinate.
 * Returns { condition, temp } or null on failure.
 */
async function fetchWeather(lat, lng) {
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`,
      { timeout: 6000 }
    );
    const item = res.data?.list?.[0];
    if (!item) return null;
    return { condition: item.weather[0].main, temp: Math.round(item.main.temp) };
  } catch {
    return null;
  }
}

module.exports = { fetchWeather };
