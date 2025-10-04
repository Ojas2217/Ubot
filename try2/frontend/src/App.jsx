import React, { useEffect, useRef } from "react";
import L from "leaflet";
import * as h3 from "h3-js";

export default function App() {
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    // Initialize Leaflet map
    mapRef.current = L.map("map", {
      center: [52.1, 5.5],
      zoom: 7,
    });

    // Use a very light basemap (CartoDB Positron) so hex outlines are visible
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // use canvas renderer for better performance with many polygons
    const canvasRenderer = L.canvas({ padding: 0.5 })
    // Create a halo (white stroke) layer underneath to increase visibility
    const haloLayer = L.geoJSON(null, {
      style: () => ({
        color: '#fff',
        weight: 4,
        opacity: 0.9,
        fillOpacity: 0,
      }),
      renderer: canvasRenderer,
    }).addTo(mapRef.current)

    layerRef.current = L.geoJSON(null, {
      style: (feature) => ({
        // stronger outline and subtle colored fill so tiles remain visible
        color: '#111',
        weight: 1.4,
        fillColor: feature.properties.color,
        // slightly higher opacity so colors are visible but still subtle
        fillOpacity: 0.22,
      }),
      renderer: canvasRenderer,
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.score !== undefined) {
          layer.bindPopup(
            `Score: ${feature.properties.score}\nH3: ${feature.properties.h3}`
          );
        }
      },
    }).addTo(mapRef.current);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${apiUrl}/api/hexes`)
      .then((r) => r.json())
      .then((data) => {
        console.log('Fetched hexes count:', data.length, data.slice(0,3))
        const features = data.map((d) => {
          const boundary = h3.h3ToGeoBoundary(d.h3, true) // try geoJson ordering

          // Normalize boundary to GeoJSON [lon, lat]
          const normalized = boundary.map((p) => {
            // If first element looks like latitude (abs<=90) and second like lon, swap
            if (Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180) {
              // ambiguous; assume [lat, lon] -> swap
              if (Math.abs(p[1]) > 90) return [p[1], p[0]]
              // otherwise assume already [lon, lat]
              return [p[0], p[1]]
            }
            return [p[0], p[1]]
          })

          // Ensure ring is closed (first == last)
          if (normalized.length > 0) {
            const first = normalized[0]
            const last = normalized[normalized.length - 1]
            if (first[0] !== last[0] || first[1] !== last[1]) {
              normalized.push([first[0], first[1]])
            }
          }

          const coords = [normalized]
          const feature = {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: coords },
            properties: {
              score: d.score,
              color: scoreToColor(d.score),
              h3: d.h3,
            },
          }
          return feature
        })

        const fc = { type: "FeatureCollection", features }
  // add to halo then main layer so halo sits underneath
  haloLayer.clearLayers()
  haloLayer.addData(fc)
  layerRef.current.clearLayers()
  layerRef.current.addData(fc)
        // fit bounds to data
        try {
          const bounds = layerRef.current.getBounds();
          if (bounds.isValid()) mapRef.current.fitBounds(bounds.pad(0.2));
        } catch (e) {
          // ignore
        }
      })
      .catch((err) => console.error("Failed to fetch hex data", err));
  }, []);

  return <div id="map" style={{ height: "100vh", width: "100vw" }} />;
}

function scoreToColor(score) {
  // Blue -> Yellow -> Red ramp
  const t = Math.max(0, Math.min(1, score / 100))
  // interpolate: 0 -> blue (0,102,204), 0.5 -> yellow (255,204,0), 1 -> red (204,0,0)
  if (t <= 0.5) {
    const u = t / 0.5
    const r = Math.round(0 + u * (255 - 0))
    const g = Math.round(102 + u * (204 - 102))
    const b = Math.round(204 - u * (204 - 0))
    return `rgb(${r},${g},${b})`
  } else {
    const u = (t - 0.5) / 0.5
    const r = Math.round(255 - u * (255 - 204))
    const g = Math.round(204 - u * (204 - 0))
    const b = Math.round(0 + u * (0 - 0))
    return `rgb(${r},${g},${b})`
  }
}
