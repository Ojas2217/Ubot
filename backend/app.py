import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import logging

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}})

# Load CSV once
hex_coords_df = pd.read_csv("csvs/id_to_coordinates.csv")  # columns: hex_id, lat, lng
hex_coords = dict(zip(hex_coords_df.hex_id, zip(hex_coords_df.lat, hex_coords_df.lng)))

# Load surge multipliers once
try:
    surge_df = pd.read_csv("csvs/surge_by_hour.csv")
    # build a lookup (city_id, hour) -> multiplier
    surge_map = {
        (int(r["city_id"]), int(r["hour"])): float(r["surge_multiplier"])
        for _, r in surge_df.iterrows()
    }
except Exception:
    surge_map = {}

# Map frontend city names to city_id in the CSVs. If your city ids differ, update this mapping.
# Assumption: Amsterdam=1, Rotterdam=2, The Hague=3, Utrecht=4, Eindhoven=5
CITY_NAME_TO_ID = {
    "Amsterdam": 1,
    "Rotterdam": 2,
    "The Hague": 3,
    "Utrecht": 4,
    "Eindhoven": 5,
}

@app.route("/api/hexes")
@cross_origin(origins="http://localhost:5173")
def hexes():
    from ML.main import main
    hex_scores = main()  # {hex_id: score}
    
    # Combine with coordinates
    items = []
    for h, score in hex_scores.items():
        if h in hex_coords:
            lat, lng = hex_coords[h]
            items.append({"h3": h, "score": score, "lat": lat, "lng": lng})

    return jsonify(items[:600])


@app.route("/api/multiplier")
@cross_origin(origins="http://localhost:5173")
def multiplier():
    """Return current surge multiplier for a given city name or city_id.

    Query params:
      - city_name (preferred) OR city_id
      - hour (optional) - integer 0-23; if omitted server local hour is used
    """
    city_name = request.args.get("city_name") or request.args.get("city")
    city_id_param = request.args.get("city_id")

    # resolve city_id
    city_id = None
    if city_id_param:
        try:
            city_id = int(city_id_param)
        except Exception:
            return jsonify({"error": "invalid city_id"}), 400
    elif city_name:
        city_id = CITY_NAME_TO_ID.get(city_name)
        if city_id is None:
            return jsonify({"error": "unknown city_name"}), 404
    else:
        return jsonify({"error": "city_name or city_id required"}), 400

    # determine hour
    hour_param = request.args.get("hour")
    if hour_param is not None:
        try:
            hour = int(hour_param) % 24
        except Exception:
            return jsonify({"error": "invalid hour"}), 400
    else:
        from datetime import datetime

        hour = datetime.now().hour

    multiplier_val = surge_map.get((city_id, hour))
    if multiplier_val is None:
        return jsonify(
            {"city_id": city_id, "hour": hour, "multiplier": None, "error": "no data"}
        )

    # try to find the name for response
    reverse_name = None
    for nm, cid in CITY_NAME_TO_ID.items():
        if cid == city_id:
            reverse_name = nm
            break

    return jsonify({"city_id": city_id, "city_name": reverse_name, "hour": hour, "multiplier": multiplier_val})

if __name__ == "__main__":
    # Configure basic logging; default to WARNING to avoid noisy info logs
    logging.basicConfig(level=logging.WARNING)
    app.run(debug=True, host="0.0.0.0", port=5000)