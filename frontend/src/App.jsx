import React, { useEffect, useRef } from "react";
import L from "leaflet";

export default function App() {
  const mapRef = useRef(null);
  const hexLayers = useRef([]);

  const cities = {
    Amsterdam: { lat: 52.3676, lng: 4.9041, zoom: 12 },
    Rotterdam: { lat: 51.9225, lng: 4.47917, zoom: 12 },
    "The Hague": { lat: 52.0705, lng: 4.3007, zoom: 12 },
    Utrecht: { lat: 52.0907, lng: 5.1214, zoom: 12 },
    Eindhoven: { lat: 51.4416, lng: 5.4697, zoom: 12 },
  };

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = L.map("map", {
      center: [52.2, 5.5],
      zoom: 7,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

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

          const layer = L.geoJSON(hexFeature, {
            style: () => ({
              color: "#111",
              weight: 1,
              fillColor,
              fillOpacity: 0.6,
            }),
          })
            .bindTooltip(`Score: ${d.score.toFixed(3)}\nHex ID: ${d.h3}`,
              {
                permanent: false,
                direction: "top",
                opacity: 0.9,
                sticky: true,
              }
            )
            .addTo(mapRef.current);


          layer.hexData = {
            center,
            originalScore: d.score,
          };
          hexLayers.current.push(layer);
        });

        mapRef.current.on("click", (e) => {
          const clickLatLng = e.latlng;

          hexLayers.current.forEach((layer) => {
            const hexCenter = L.latLng(
              layer.hexData.center[0],
              layer.hexData.center[1]
            );
            const distance = clickLatLng.distanceTo(hexCenter);

            const factor = 1 / (1 + distance / 1000);
            const actual = layer.hexData.originalScore;
            const adjustedScore = layer.hexData.originalScore * factor;

            let fillColor = scoreToColor(adjustedScore);

            layer.setStyle({ fillColor });
            layer.bindTooltip(
              `Actual Score: ${actual.toFixed(3)}<br>
              Adjusted Score: ${adjustedScore.toFixed(
                3
              )}<br>Distance: ${(distance / 1000).toFixed(2)} km`
              , {
                permanent: false,
                direction: "top",
                opacity: 0.9,
                sticky: true,
              }
            );
          });
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
  function scoreToColor(score) {
    const ratio = Math.min(Math.max(score / 17, 0), 1);

    let r, g, b = 0;

    if (ratio < 0.5) {
      r = 255;
      g = Math.round(255 * (ratio * 2));
    } else {
      g = 255;
      r = Math.round(255 * (2 - ratio * 2));
    }

    return `rgb(${r},${g},${b})`;
  }
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
            }}
          >
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
          }}
        >
          <div style={{ maxWidth: "350px", margin: "0 auto" }}>
            <h1>About</h1>
            <p>
              This website aims to visualize the Linear Regression Model which
              our team developed during this hackathon.
            </p>
            <p>
              By Performing an 80-20 train-test split on the csv data we trained
              an ML model to generate a score for each hexagonal grid cell for
              our test data. These scores indicate the earning potential of a
              driver in those areas
            </p>
            <p>
              It goes without saying that a higher score indicates better earning
              potential which is indicated by the green hexagons, while the red
              hexagons indicate lower earning potential and yellow acts as the
              middle ground.
            </p>

            <p>
              Now it may not always be feasible for a rider in one city to travel
              to a hexagon in a different city just because it has a better
              score, which is why by clicking the map we take into account the
              current location of the rider and adjust the scores accordingly.
            </p>
            <p>
              Due to the training set being small our model was able to achieve
              an R^2 of around 0.68 and an RMSE of 2.85 when comparing our
              predictions with the actual earning potential of a hexagon, which
              for a proof concept with limited data and features is not too bad.
            </p>
            <p>
              Potential improvements with more data could be adding more features
              which take into account the wellness of a driver as well as their
              personal preferences. Real time updating of data could also be
              interesting to look at.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
