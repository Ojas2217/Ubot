import React, { useEffect, useRef } from "react";
import L from "leaflet";

export default function App() {
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    // Initialize map
    mapRef.current = L.map("map", {
      center: [52.1, 5.5], // roughly center of Netherlands
      zoom: 7,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // Layer to hold hexes
    layerRef.current = L.layerGroup().addTo(mapRef.current);

    // Fetch hexes from backend
    const apiUrl = "http://localhost:5000";
    fetch(`${apiUrl}/api/hexes`)
      .then((r) => r.json())
      .then((data) => {
        console.log("Fetched hexes:", data);

        layerRef.current.clearLayers();

        data.forEach((d) => {
          const circle = L.circle([d.lat, d.lng], {
            radius: 30, // in meters, adjust size
            color: "#111",
            fillColor: scoreToColor(d.score),
            fillOpacity: 0.5,
            weight: 2,
          }).bindPopup(`Score: ${d.score}<br/>Hex ID: ${d.h3}`);

          circle.addTo(layerRef.current);
        });

        // Fit map to all hexes
        const bounds = layerRef.current.getBounds();
        if (bounds.isValid()) mapRef.current.fitBounds(bounds.pad(0.2));
      })
      .catch((err) => console.error("Failed to fetch hex data", err));
  }, []);

  return <div id="map" style={{ height: "100vh", width: "100vw" }} />;
}

function scoreToColor(score) {
  if (score <= 7) return "green";
  if (score <= 14) return "yellow";
  return "red";
}

