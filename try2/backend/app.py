from flask import Flask, jsonify
from flask_cors import CORS
import random
import h3
import logging

logger = logging.getLogger(__name__)


def geo_to_h3_compat(lat, lon, res):
    """Compatibility wrapper: return H3 index for lat/lon using whatever
    function is available in the installed `h3` package.
    """
    # Try common direct function signature: geo_to_h3(lat, lon, res)
    try:
        if hasattr(h3, "geo_to_h3"):
            return h3.geo_to_h3(lat, lon, res)
    except Exception:
        pass

    # Try several alternate function names and signatures robustly
    # Attempt latlng_to_cell(lat, lon, res)
    try:
        if hasattr(h3, "latlng_to_cell"):
            try:
                return h3.latlng_to_cell(lat, lon, res)
            except TypeError:
                # maybe signature is latlng_to_cell([lat, lon], res)
                return h3.latlng_to_cell([lat, lon], res)
    except Exception:
        pass

    # Attempt lat_lng_to_cell(lat, lon, res)
    try:
        if hasattr(h3, "lat_lng_to_cell"):
            return h3.lat_lng_to_cell(lat, lon, res)
    except Exception:
        pass

    # Try submodule locations used in some distributions
    try:
        from h3.api.basic import geo_to_h3 as g2h

        return g2h(lat, lon, res)
    except Exception:
        pass

    try:
        from h3.api.basic_int import geo_to_h3 as g2h_int

        return g2h_int(lat, lon, res)
    except Exception:
        pass

    # Older packaging might expose a nested module
    try:
        return h3.h3.geo_to_h3(lat, lon, res)
    except Exception:
        pass

    logger.error("No compatible geo_to_h3 function found in installed h3 package")
    raise RuntimeError("No compatible geo_to_h3 function found in installed h3 package")

app = Flask(__name__)
CORS(app)

# Netherlands bounding box (approx) lon/lat
NETHERLANDS_BBOX = {
    "min_lat": 50.7,
    "max_lat": 53.6,
    "min_lon": 3.3,
    "max_lon": 7.1,
}

def random_point_in_bbox(bbox):
    lat = random.uniform(bbox["min_lat"], bbox["max_lat"])
    lon = random.uniform(bbox["min_lon"], bbox["max_lon"])
    return lat, lon

@app.route("/api/hexes")
def hexes():
    # Generate some random H3 indexes inside NL at resolution 9
    res = 9
    hexes = {}
    for _ in range(40):
        lat, lon = random_point_in_bbox(NETHERLANDS_BBOX)
        try:
            idx = geo_to_h3_compat(lat, lon, res)
        except Exception as e:
            # If we can't compute H3, return an error-like response (empty list)
            logger.exception("Failed to compute h3 index: %s", e)
            return jsonify({"error": "h3 not available or incompatible"}), 500
        # assign random score 0-100
        score = random.randint(0, 100)
        hexes[idx] = score

    items = [{"h3": k, "score": v} for k, v in hexes.items()]
    return jsonify(items)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
