import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App";
import Preferences from "./components/Preferences";
import Header from "./components/Header";
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Header />
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/preferences" element={<Preferences />} />
      <Route path="/dashboard" element={<App />} />
    </Routes>
  </BrowserRouter>
);
