import React, { useEffect, useRef } from "react";
import L from "leaflet";

export default function App() {
  const mapRef = useRef(null);
  const cities = {
    Amsterdam: { lat: 52.3676, lng: 4.9041, zoom: 12 },
    Rotterdam: { lat: 51.9225, lng: 4.47917, zoom: 12 },
    "The Hague": { lat: 52.0705, lng: 4.3007, zoom: 12 },
    Utrecht: { lat: 52.0907, lng: 5.1214, zoom: 12 },
    Eindhoven: { lat: 51.4416, lng: 5.4697, zoom: 12 },
  };
  useEffect(() => {
    if (mapRef.current) return;


    // Initialize Leaflet map centered on NL
    mapRef.current = L.map("map", {
      center: [52.2, 5.5],
      zoom: 7,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // Fetch your hex IDs + scores + lat/lng from backend
    fetch("http://localhost:5000/api/hexes")
      .then((res) => res.json())
      .then((data) => {
        const HEX_RADIUS = 20; // in meters, adjust visual size
        data.forEach((d) => {
          const center = [d.lat, d.lng];

          // Generate hex polygon around center
          const hexCoords = [];
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i; // 60 deg
            const dx = HEX_RADIUS * Math.cos(angle);
            const dy = HEX_RADIUS * Math.sin(angle);

            const lat = center[0] + dy / 111320;
            const lng =
              center[1] +
              dx / ((40075000 * Math.cos(center[0] * (Math.PI / 180))) / 360);

            hexCoords.push([lng, lat]); // GeoJSON order [lng, lat]
          }
          hexCoords.push(hexCoords[0]); // close polygon

          const hexFeature = {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [hexCoords] },
            properties: { score: d.score, h3: d.h3 },
          };

          L.geoJSON(hexFeature, {
            style: () => ({
              color: "#111",
              weight: 1,
              fillColor:
                d.score > 13 ? "red" : d.score > 6 ? "yellow" : "green",
              fillOpacity: 0.6,
            }),
          })
            .bindPopup(`Score: ${d.score}\nHex ID: ${d.h3}`)
            .addTo(mapRef.current);
        });
      })
      .catch((err) => console.error("Failed to fetch hex data", err));
  }, []);

  const buttonStyle = {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "14px",
  };
  return (
    <div>
      <header
        style={{
          backgroundColor: "#111",
          color: "white",
          padding: "12px 20px",
          fontFamily: "Arial, sans-serif",
          fontSize: "22px",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        Ubot
      </header>
      <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
        <div id="map" style={{ height: "100%", width: "100%" }} />
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "60px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            zIndex: 1000,
          }}
        >
          {Object.keys(cities).map((city) => (
            <button
              key={city}
              style={buttonStyle}
              onClick={() => {
                const { lat, lng, zoom } = cities[city];
                mapRef.current.setView([lat, lng], zoom);
              }}
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
