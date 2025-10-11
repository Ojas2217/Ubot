# Ubot   

Ubot is a web application made at the JunctionX Delft hackathon that visualizes driver earning potential across different regions in the Netherlands.  
It uses a **machine learning regression model** to assign a *score* to each hexagonal grid cell, helping drivers identify areas with higher potential earnings.  

---

## Features  

- **Map (Leaflet.js)**  
  Displays hexagonal zones across cities in the Netherlands.  

- **Heatmap**  
  - 🟥 **Low potential**  
  - 🟨 **Moderate potential**  
  - 🟩 **High potential**  
  The gradient transitions smoothly using a custom color mapping function.  

- **Dynamic Re-Scoring Based on Distance**  
  Clicking on any location re-weights the hexagon scores according to the driver’s proximity — discouraging far-away ride suggestions.  

- **City Shortcuts**  
  Quickly recenter the map on Amsterdam, Rotterdam, The Hague, Utrecht, or Eindhoven. Selecting a location on the map also displays the nearest hex from the driver


---

## Machine Learning Model  

The ML model was trained using **linear regression** on CSV data representing ride/earning statistics.  

- **Train-Test Split:** 80-20  
- **Metrics:**  
  - R² ≈ **0.68**  
  - RMSE ≈ **2.85**  

---

## ⚙️ Tech Stack  

**Frontend:**  
- React  
- Leaflet.js  

**Backend:**  
- Flask (serves hex grid data at `/api/hexes`)  

**Other:**  
- GeoJSON for polygon rendering  
- CARTO basemap tiles  

---

## 📦 Setup  

1. Clone this repository  
   ```bash
   git clone https://github.com/Ojas2217/Ubot
   cd ubot/frontend
   ```
2. Install dependencies
  ```bash
  npm install
  ```
3. Start the frontend
   ```bash
   npm run dev
   ```
4. Start the backend from Ubot/backend/app.py

   Your frontend should now be live.

