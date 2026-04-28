const axios = require("axios");

/**
 * Reverse-geocodes a lat/lng to a human-readable street name
 * using the Nominatim OpenStreetMap API.
 */
async function reverseGeocode(lat, lng) {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { timeout: 5000, headers: { "User-Agent": "SmartRouteAI/1.0" } }
    );
    const addr = res.data?.address;
    return addr?.road || addr?.suburb || addr?.city_district || "Current route";
  } catch {
    return "Current route";
  }
}

module.exports = { reverseGeocode };
