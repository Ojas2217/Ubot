import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import About from "./About";

export default function App() {
  const [route, setRoute] = useState(window.location.pathname || "/");

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigateTo(path) {
    if (window.location.pathname === path) return;
    // if we're leaving the home page, properly dispose the Leaflet map so it can be re-created on return
    if (window.location.pathname === "/" && path !== "/") {
      disposeMap();
    }
    window.history.pushState({}, "", path);
    setRoute(path);
  }

  function disposeMap() {
    try {
      if (mapRef.current) {
        // remove Leaflet map and its DOM references
        mapRef.current.remove();
      }
    } catch (e) {
      // ignore
    }
    // clear any leftover DOM inside the map container so a fresh map can mount
    try {
      const container = document.getElementById("map");
      if (container) container.innerHTML = "";
    } catch (e) {}
    mapRef.current = null;
    hexLayers.current = [];
    bestLineRef.current = null;
    bestHexRef.current = null;
  }
  const mapRef = useRef(null);
  const hexLayers = useRef([]);
  const selectedMarkerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [weatherLocation, setWeatherLocation] = useState(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(null);
  const [currentCityForMultiplier, setCurrentCityForMultiplier] =
    useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function greetingForDate(d) {
    const h = d.getHours();
    if (h >= 5 && h < 12) return "Good morning, Stefan";
    if (h >= 12 && h < 17) return "Good afternoon, Stefan";
    if (h >= 17 && h < 21) return "Good evening, Stefan";
    return "Hello, Stefan";
  }
  const bestLineRef = useRef(null);
  const bestHexRef = useRef(null);

  const cities = {
    Amsterdam: { lat: 52.3676, lng: 4.9041, zoom: 12 },
    Rotterdam: { lat: 51.9225, lng: 4.47917, zoom: 12 },
    "The Hague": { lat: 52.0705, lng: 4.3007, zoom: 12 },
    Utrecht: { lat: 52.0907, lng: 5.1214, zoom: 12 },
    Eindhoven: { lat: 51.4416, lng: 5.4697, zoom: 12 },
  };

  useEffect(() => {
    // only initialize the map when we're on the home route
    if (route !== "/") return;
    if (mapRef.current) return;

    mapRef.current = L.map("map", {
      center: [52.2, 5.5],
      zoom: 7,
    });

    // ensure Leaflet properly lays out tiles after mounting
    setTimeout(() => {
      try {
        mapRef.current && mapRef.current.invalidateSize();
      } catch (e) {}
    }, 50);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // Fetch initial weather for map center
    try {
      fetchWeather(52.2, 5.5);
    } catch (e) {}

    // Load hex grid data from backend and render polygons
    fetch("http://localhost:5000/api/hexes")
      .then((res) => res.json())
      .then((data) => {
        const HEX_RADIUS = 15;
        data.forEach((d) => {
          const center = [d.lat, d.lng];

          const hexCoords = [];
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const dx = HEX_RADIUS * Math.cos(angle);
            const dy = HEX_RADIUS * Math.sin(angle);

            const lat = center[0] + dy / 111320;
            const lng =
              center[1] +
              dx / ((40075000 * Math.cos(center[0] * (Math.PI / 180))) / 360);

            hexCoords.push([lng, lat]);
          }
          hexCoords.push(hexCoords[0]);

          const hexFeature = {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [hexCoords] },
            properties: { score: d.score, h3: d.h3 },
          };

          const fillColor = scoreToColor(d.score);

          const originalTooltip = `Score: ${d.score.toFixed(3)}\nHex ID: ${
            d.h3
          }`;
          const layer = L.geoJSON(hexFeature, {
            style: () => ({
              color: "#111",
              weight: 1,
              fillColor,
              fillOpacity: 0.6,
            }),
          })
            .bindTooltip(originalTooltip, {
              permanent: false,
              direction: "top",
              opacity: 0.9,
              sticky: true,
            })
            .addTo(mapRef.current);

          layer.hexData = {
            center,
            originalScore: d.score,
            originalTooltip,
          };
          hexLayers.current.push(layer);
        });

        mapRef.current.on("click", (e) => {
          const clickLatLng = e.latlng;

          applyAdjustmentAt(clickLatLng);

          // Add a pin marker at the clicked location using helper
          try {
            addSelectionPin(clickLatLng);
          } catch (err) {
            console.error("Failed to add selection pin", err);
          }
        });
      })
      .catch((err) => console.error("Failed to fetch hex data", err));
  }, [route]);

  // Helper to add selection pin (removes previous pin)
  function addSelectionPin(latlng) {
    if (!mapRef.current) return;

    if (selectedMarkerRef.current) {
      try {
        mapRef.current.removeLayer(selectedMarkerRef.current);
      } catch (e) {
        /* ignore */
      }
      selectedMarkerRef.current = null;
    }

    const pinSvg = `
      <svg viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#e74c3c" stroke="#c0392b" stroke-width="1"/>
        <circle cx="12" cy="9" r="2.5" fill="white" />
      </svg>
    `;

    const pinIcon = L.divIcon({
      className: "custom-pin",
      html: pinSvg,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const marker = L.marker([latlng.lat, latlng.lng], {
      icon: pinIcon,
      interactive: false,
    }).addTo(mapRef.current);

    const formatted = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    // Bind a temporary tooltip while we reverse-geocode
    marker
      .bindTooltip(`Loading address...`, {
        permanent: true,
        direction: "top",
        offset: [0, -36],
        className: "pin-label",
        interactive: true,
      })
      .openTooltip();

    // Asynchronously fetch a human-readable address and update the tooltip
    fetchAddress(latlng.lat, latlng.lng)
      .then((addr) => {
        const googleLink = getGoogleMapsDirectionsLink(latlng.lat, latlng.lng);
        const display = addr || formatted;
        const html = `${escapeHtml(
          display
        )}<br/><a href="${googleLink}" target="_blank" rel="noopener noreferrer">Get directions</a>`;
        try {
          const tt = marker.getTooltip && marker.getTooltip();
          if (tt && typeof tt.setContent === "function") {
            tt.setContent(html);
          } else {
            marker.unbindTooltip && marker.unbindTooltip();
            marker
              .bindTooltip(html, {
                permanent: true,
                direction: "top",
                offset: [0, -36],
                className: "pin-label",
                interactive: true,
              })
              .openTooltip();
          }
        } catch (e) {
          // fallback: rebind tooltip
          marker.unbindTooltip && marker.unbindTooltip();
          marker
            .bindTooltip(html, {
              permanent: true,
              direction: "top",
              offset: [0, -36],
              className: "pin-label",
              interactive: true,
            })
            .openTooltip();
        }
      })
      .catch((err) => {
        // leave coords if reverse-geocode fails
        console.error("Reverse geocode failed", err);
      });

    selectedMarkerRef.current = marker;
    // After placing the pin, apply score adjustments around it
    try {
      applyAdjustmentAt(latlng);
      // Update weather for the pinned location
      try {
        fetchWeather(latlng.lat, latlng.lng);
      } catch (e) {}
    } catch (e) {
      console.error("Failed to apply adjustments after placing pin", e);
    }
  }

  // Fetch weather (temperature) for given coords using Open-Meteo
  async function fetchWeather(lat, lng) {
    try {
      // Request current weather (temperature in Celsius)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(
        lng
      )}&current_weather=true&temperature_unit=celsius`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();
      if (data && data.current_weather) {
        setWeather({
          temp: data.current_weather.temperature,
          wind: data.current_weather.windspeed,
          time: data.current_weather.time,
          code: data.current_weather.weathercode,
        });
        setWeatherLocation(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
      } else {
        setWeather(null);
      }
    } catch (e) {
      console.error("fetchWeather failed", e);
      setWeather(null);
    }
  }

  function renderWeatherIcon(code) {
    // Map Open-Meteo weather codes to simple SVG icons
    // Reference: https://open-meteo.com/en/docs
    if (code === null || code === undefined) return null;
    // Clear
    if (code === 0) {
      return (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" fill="#FFD24C" />
        </svg>
      );
    }
    // Mainly clear / partly cloudy
    if (code >= 1 && code <= 3) {
      return (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="4" fill="#FFD24C" />
          <path d="M17 14a4 4 0 0 0-4-4 4 4 0 0 0-4 4" fill="#E6EEF6" />
        </svg>
      );
    }
    // Fog / mist
    if (code === 45 || code === 48) {
      return (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="9" width="18" height="2" rx="1" fill="#B0BEC5" />
          <rect x="3" y="13" width="18" height="2" rx="1" fill="#B0BEC5" />
        </svg>
      );
    }
    // Drizzle / Rain
    if (
      (code >= 51 && code <= 57) ||
      (code >= 61 && code <= 67) ||
      (code >= 80 && code <= 82)
    ) {
      return (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7 10a5 5 0 0 1 10 0h1a3 3 0 0 1 0 6H6a4 4 0 0 1 1-8"
            fill="#90A4AE"
          />
          <path
            d="M8.5 18c0-1 1-2 1-2s1 1 1 2-1 2-1 2-1-1-1-2z"
            fill="#4FC3F7"
          />
          <path
            d="M12 18c0-1 1-2 1-2s1 1 1 2-1 2-1 2-1-1-1-2z"
            fill="#4FC3F7"
          />
        </svg>
      );
    }
    // Snow
    if (code >= 71 && code <= 77) {
      return (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="3" fill="#E3F2FD" />
          <text x="12" y="18" textAnchor="middle" fontSize="10" fill="#90A4AE">
            ❄
          </text>
        </svg>
      );
    }
    // Thunderstorm
    if (code >= 95) {
      return (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M5 13a7 7 0 1 1 13.93 1H5z" fill="#546E7A" />
          <path d="M11 12l2 4h-3l2 4" fill="#FFEE58" />
        </svg>
      );
    }
    // Default: cloud
    return (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 14a4 4 0 0 1 0-8 5 5 0 0 1 9.9 1A4 4 0 0 1 18 14H6z"
          fill="#CFD8DC"
        />
      </svg>
    );
  }

  // Apply adjusted scoring and tooltips based on a given latlng
  function applyAdjustmentAt(latlng) {
    if (!hexLayers.current || !hexLayers.current.length) return;

    // Clear previous best line and highlight
    if (bestLineRef.current && mapRef.current) {
      try {
        mapRef.current.removeLayer(bestLineRef.current);
      } catch (e) {}
      bestLineRef.current = null;
    }
    if (bestHexRef.current) {
      try {
        const prev = bestHexRef.current;
        const orig = prev.hexData?.originalScore ?? 0;
        const fillColor = scoreToColor(orig);
        if (typeof prev.eachLayer === "function") {
          prev.eachLayer((c) => {
            try {
              c.setStyle && c.setStyle({ fillColor, weight: 1 });
            } catch (e) {}
          });
        } else {
          prev.setStyle && prev.setStyle({ fillColor, weight: 1 });
        }
      } catch (e) {}
      bestHexRef.current = null;
    }

    let bestScore = -Infinity;
    let bestLayer = null;
    let bestCenter = null;

    hexLayers.current.forEach((layer) => {
      try {
        const hexCenter = L.latLng(
          layer.hexData.center[0],
          layer.hexData.center[1]
        );
        const distance = latlng.distanceTo(hexCenter);

        const factor = 1 / (1 + distance / 1000);
        const actual = layer.hexData.originalScore;
        const adjustedScore = layer.hexData.originalScore * factor;

        let fillColor = scoreToColor(adjustedScore);

        // Apply style and tooltip to child polygons
        if (typeof layer.eachLayer === "function") {
          layer.eachLayer((child) => {
            try {
              child.setStyle && child.setStyle({ fillColor });
              child.unbindTooltip && child.unbindTooltip();
              child.bindTooltip &&
                child.bindTooltip(
                  `Actual Score: ${actual.toFixed(
                    3
                  )}<br>Adjusted Score: ${adjustedScore.toFixed(
                    3
                  )}<br>Distance: ${(distance / 1000).toFixed(2)} km`,
                  {
                    permanent: false,
                    direction: "top",
                    opacity: 0.9,
                    sticky: true,
                  }
                );
            } catch (e) {}
          });
        } else {
          layer.setStyle && layer.setStyle({ fillColor });
          layer.unbindTooltip && layer.unbindTooltip();
          layer.bindTooltip &&
            layer.bindTooltip(
              `Actual Score: ${actual.toFixed(
                3
              )}<br>Adjusted Score: ${adjustedScore.toFixed(3)}<br>Distance: ${(
                distance / 1000
              ).toFixed(2)} km`,
              { permanent: false, direction: "top", opacity: 0.9, sticky: true }
            );
        }
        // track best adjusted score
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestLayer = layer;
          bestCenter = layer.hexData.center;
        }
      } catch (e) {
        // ignore per-layer errors
      }
    });

    // Draw polyline from pin to best hex and highlight it
    if (bestCenter && mapRef.current) {
      try {
        const line = L.polyline(
          [
            [latlng.lat, latlng.lng],
            [bestCenter[0], bestCenter[1]],
          ],
          { color: "#1e90ff", weight: 3, dashArray: "6 6" }
        ).addTo(mapRef.current);
        bestLineRef.current = line;

        if (bestLayer) {
          try {
            if (typeof bestLayer.eachLayer === "function") {
              bestLayer.eachLayer((c) => {
                try {
                  c.setStyle && c.setStyle({ weight: 3 });
                } catch (e) {}
              });
            } else {
              bestLayer.setStyle && bestLayer.setStyle({ weight: 3 });
            }
            bestHexRef.current = bestLayer;
          } catch (e) {}
        }
      } catch (e) {
        console.error("Failed to draw best-line", e);
      }
    }
  }

  // Reverse geocode using Nominatim (OpenStreetMap). Keep it lightweight.
  async function fetchAddress(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Nominatim error");
      const data = await res.json();
      // Prefer road + house number, fall back to display_name
      const addr = data?.address;
      if (!addr) return data?.display_name || null;
      const parts = [];
      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts.push(addr.house_number);
      if (addr.city) parts.push(addr.city);
      if (addr.postcode) parts.push(addr.postcode);
      return parts.length ? parts.join(", ") : data.display_name || null;
    } catch (e) {
      return null;
    }
  }

  function getGoogleMapsDirectionsLink(lat, lng) {
    // Opens Google Maps directions to the point
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      lat + "," + lng
    )}`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function (s) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[s];
    });
  }

  // Remove pin and reset any adjusted scoring/styles
  function clearSelectionAndReset() {
    // Remove marker
    if (selectedMarkerRef.current && mapRef.current) {
      try {
        mapRef.current.removeLayer(selectedMarkerRef.current);
      } catch (e) {}
      selectedMarkerRef.current = null;
    }

    // remove best line if present
    if (bestLineRef.current && mapRef.current) {
      try {
        mapRef.current.removeLayer(bestLineRef.current);
      } catch (e) {}
      bestLineRef.current = null;
    }

    // clear highlighted best hex
    if (bestHexRef.current) {
      try {
        const prev = bestHexRef.current;
        const orig = prev.hexData?.originalScore ?? 0;
        const fillColor = scoreToColor(orig);
        if (typeof prev.eachLayer === "function")
          prev.eachLayer((c) => {
            try {
              c.setStyle && c.setStyle({ fillColor, weight: 1 });
            } catch (e) {}
          });
        else prev.setStyle && prev.setStyle({ fillColor, weight: 1 });
      } catch (e) {}
      bestHexRef.current = null;
    }

    // Reset hex layers to original score and tooltip
    if (hexLayers.current && hexLayers.current.length) {
      hexLayers.current.forEach((layer) => {
        const original = layer.hexData?.originalScore ?? 0;
        const fillColor = scoreToColor(original);
        try {
          // GeoJSON layers usually contain one or more child polygon layers
          // Unbind any existing tooltips on parent and children to avoid overlays
          try {
            layer.unbindTooltip && layer.unbindTooltip();
          } catch (e) {}

          if (typeof layer.eachLayer === "function") {
            layer.eachLayer((child) => {
              try {
                if (typeof child.setStyle === "function")
                  child.setStyle({ fillColor });
                if (typeof child.unbindTooltip === "function")
                  child.unbindTooltip();
                if (typeof child.bindTooltip === "function") {
                  const tooltipText =
                    layer.hexData?.originalTooltip ??
                    `Score: ${original.toFixed(3)}\nHex ID: ${
                      layer.feature?.properties?.h3 ?? ""
                    }`;
                  child.bindTooltip(tooltipText, {
                    permanent: false,
                    direction: "top",
                    opacity: 0.9,
                    sticky: true,
                  });
                }
              } catch (e) {
                // ignore per-child errors
              }
            });
          } else {
            // fallback for non-GeoJSON layers
            layer.setStyle({ fillColor });
            layer.unbindTooltip && layer.unbindTooltip();
            layer.bindTooltip &&
              layer.bindTooltip(
                `Score: ${original.toFixed(3)}\nHex ID: ${
                  layer.feature?.properties?.h3 ?? ""
                }`,
                {
                  permanent: false,
                  direction: "top",
                  opacity: 0.9,
                  sticky: true,
                }
              );
          }
        } catch (e) {
          // ignore errors for layers not present
        }
      });
    }
  }

  const buttonStyle = {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "14px",
  };
  function scoreToColor(score) {
    const ratio = Math.min(Math.max(score / 17, 0), 1);

    let r,
      g,
      b = 0;

    if (ratio < 0.5) {
      r = 255;
      g = Math.round(255 * (ratio * 2));
    } else {
      g = 255;
      r = Math.round(255 * (2 - ratio * 2));
    }

    return `rgb(${r},${g},${b})`;
  }
  // If we're on the /about route, render only the About page (with header)
  if (route === "/about") {
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          <div>Ubot</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => navigateTo("/")}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}>
              Home
            </button>
          </div>
        </header>
        <div style={{ padding: 20 }}>
          <About />
        </div>
      </div>
    );
  }

  // Default map + sidebar layout
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <div>Ubot</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => navigateTo("/about")}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              padding: "6px 10px",
              borderRadius: 6,
              cursor: "pointer",
            }}>
            About
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ position: "relative", height: "93vh", width: "75vw" }}>
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
            }}>
            {/* Dropdown menu for cities + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <button
                  style={buttonStyle}
                  onClick={() => setMenuOpen((s) => !s)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}>
                  Select City ▾
                </button>
                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "42px",
                      left: 0,
                      backgroundColor: "white",
                      borderRadius: 6,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      padding: 8,
                      zIndex: 2000,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}>
                    {Object.keys(cities).map((city) => (
                      <button
                        key={city}
                        style={buttonStyle}
                        onClick={() => {
                          const { lat, lng, zoom } = cities[city];
                          mapRef.current.setView([lat, lng], zoom);
                          setMenuOpen(false);
                          // fetch current multiplier for this city
                          setCurrentCityForMultiplier(city);
                          fetch(
                            `http://localhost:5000/api/multiplier?city_name=${encodeURIComponent(
                              city
                            )}`
                          )
                            .then((r) => r.json())
                            .then((data) => {
                              if (data && data.multiplier) {
                                setCurrentMultiplier(data.multiplier);
                              } else {
                                setCurrentMultiplier(null);
                              }
                            })
                            .catch((e) => {
                              console.error("Failed to fetch multiplier", e);
                              setCurrentMultiplier(null);
                            });
                        }}>
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Icon buttons to the right of dropdown */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  title="Use my location"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      alert("Geolocation is not supported by your browser");
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        const latlng = L.latLng(lat, lng);
                        mapRef.current.setView([lat, lng], 13);
                        addSelectionPin(latlng);
                      },
                      (err) => {
                        console.error("Geolocation failed", err);
                        alert("Unable to retrieve your location");
                      }
                    );
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    border: "none",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    cursor: "pointer",
                  }}>
                  {/* pin icon */}
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      fill="#e74c3c"
                      stroke="#c0392b"
                      strokeWidth="1"
                    />
                    <circle cx="12" cy="9" r="2.5" fill="white" />
                  </svg>
                </button>

                <button
                  title="Remove pin"
                  onClick={() => clearSelectionAndReset()}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    border: "none",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    cursor: "pointer",
                  }}>
                  {/* cross icon */}
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0 0-1.4z"
                      fill="#333"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "100px",
              left: "20px",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "10px",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              zIndex: 1000,
              font: "14px Arial, sans-serif",
            }}>
            Scores
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "green",
                }}
              />
              <span>High</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "yellow",
                }}
              />
              <span>Moderate</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "red",
                }}
              />
              <span>Low</span>
            </div>
          </div>
        </div>
        <div
          id="about"
          style={{
            padding: "10px 20px",
            fontFamily: "Arial, sans-serif",
            color: "white",
            fontSize: "14px",
            backgroundColor: "#111",
          }}>
          <div style={{ maxWidth: "350px", margin: "0 auto" }}>
            <div className="widget-row" style={{ marginBottom: 8 }}>
              <div className="widget-card time-widget">
                <div style={{ textAlign: "center", width: "100%" }}>
                  <div style={{ fontSize: 20, fontWeight: "bold" }}>
                    {now.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="widget-card weather-widget">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>{weather ? renderWeatherIcon(weather.code) : null}</div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 18, fontWeight: "bold" }}>
                      {weather ? `${Math.round(weather.temp)}°C` : "—"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {weather
                        ? `Wind ${Math.round(weather.wind)} km/h`
                        : "No data"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <h1>{greetingForDate(now)}</h1>
            <div style={{ marginTop: 6, fontSize: 20, opacity: 0.9 }}>
              {currentCityForMultiplier ? (
                currentMultiplier ? (
                  <div>
                    In <strong>{currentCityForMultiplier}</strong> the current
                    activity multiplier is <strong>{currentMultiplier}</strong>.
                  </div>
                ) : (
                  <div>
                    In {currentCityForMultiplier} the current activity
                    multiplier is not available.
                  </div>
                )
              ) : (
                <div>Select a city to see the current activity multiplier.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
