import { useEffect, useState } from "react";
import { normalizeGeocodeResult } from "../utils/helpers";

export default function GeocodeInput({ id, label, placeholder, selectedLocation, onSelect, onClear }) {
  const [query, setQuery] = useState(selectedLocation?.placeName || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(selectedLocation?.placeName || "");
  }, [selectedLocation?.placeName]);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) { setResults([]); setLoading(false); return undefined; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${q} Delhi`)}&format=json&limit=5`,
          { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "SmartRouteAI" } }
        );
        if (!response.ok) throw new Error("Geocode request failed");
        const data = await response.json();
        setResults(data.map(normalizeGeocodeResult));
      } catch (error) {
        if (error.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const handleChange = (event) => {
    setQuery(event.target.value);
    setOpen(true);
    if (selectedLocation && event.target.value !== selectedLocation.placeName) onClear();
  };

  return (
    <div className="geocode-wrap">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        className="text-input"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
      />
      {loading && <span className="loading-geocode mono">...</span>}
      {open && results.length > 0 && (
        <ul className="geocode-results">
          {results.map((result, idx) => (
            <li key={`${result.placeName}-${idx}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(result);
                  setQuery(result.placeName);
                  setResults([]);
                  setOpen(false);
                }}
              >
                {result.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedLocation && (
        <div className="confirmed mono">
          <span>✓</span>
          <span>{selectedLocation.placeName}</span>
        </div>
      )}
    </div>
  );
}