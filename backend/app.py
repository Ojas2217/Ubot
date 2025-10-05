import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

# Load CSV once
hex_coords_df = pd.read_csv("Force-Pushers---Smart-Earner-Assistant-\\csvs\\id_to_coordinates.csv")  # columns: hex_id, lat, lng
hex_coords = dict(zip(hex_coords_df.hex_id, zip(hex_coords_df.lat, hex_coords_df.lng)))

@app.route("/api/hexes")
def hexes():
    from ML.main import main
    hex_scores = main()  # {hex_id: score}
    
    # Combine with coordinates
    items = []
    for h, score in hex_scores.items():
        if h in hex_coords:
            lat, lng = hex_coords[h]
            items.append({"h3": h, "score": score, "lat": lat, "lng": lng})

    print(items)
    return jsonify(items[:600])

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)