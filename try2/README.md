# NL Hex Map

This project is a minimal Flask + React (Vite) app that displays an interactive map of the Netherlands with H3 hexagons overlaid. The backend serves random hex indices with scores (0-100) and the frontend renders them using Mapbox GL and h3-js.

Quick start (Windows PowerShell):

1. Backend

   cd backend;
   python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; python app.py

2. Frontend

   cd frontend;
   npm install; npm run dev

Set your Mapbox token in `frontend/.env` or `frontend/.env.local` as VITE_MAPBOX_TOKEN.
If you see an error in the browser: "An API access token is required to use Mapbox GL", create a `.env` file in the `frontend` folder with:

VITE_MAPBOX_TOKEN=your_mapbox_token_here

Then restart the Vite dev server.

Notes

- The frontend fetches data from `http://localhost:5000/api/hexes` by default.
- Replace the map style URL or Mapbox token as desired.
