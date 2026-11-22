# AtmosQI — Open-Source Environmental Data Explorer

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Coverage](https://img.shields.io/badge/Coverage-Pan--India-success?style=flat-square)](#)
[![Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Vite%20%7C%20Leaflet-informational?style=flat-square)](#)
[![AI Engine](https://img.shields.io/badge/Inference-Edge%20ONNX%20Wasm-purple?style=flat-square)](#)

**An open-source environmental data platform that makes public air quality data across India easier to discover, understand, map, and predict.**

[Live Architecture](#architecture) • [Dataset Specifications](DATASET_SPECIFICATION.md) • [Deep Learning Engine](DEEP_LEARNING_SPECIFICATION.md) • [Quickstart](#quickstart)

</div>

---

## 🌟 Key Features

1. **Dual-Lens Environmental Engine:**
   - **Ground Station Truth:** 230 CPCB continuous monitoring stations across 127 Indian cities with multi-pollutant chemical fingerprinting ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{SO}_2$, $\text{CO}$, $\text{O}_3$, $\text{NH}_3$).
   - **Continuous Satellite Raster:** $10\text{ km}$ spatial grid covering all 33,074 active land pixels of India (Zenodo / CREA).

2. **Fluid Harmonic Atmospheric Wind Simulation:**
   - 60fps HTML5 Canvas particle streamline simulation featuring natural harmonic boundary-layer micro-turbulence and wave eddication.
   - Multi-segment quadratic bezier streamline ribbons with dynamic speed-adaptive color ramp (calm emerald $\rightarrow$ electric cyan $\rightarrow$ amber $\rightarrow$ coral).
   - Real-time 10m wind vector field derived from European ECMWF / Open-Meteo across 12 strategic meteorological anchors in India.

3. **Lagrangian Trajectory & Dispersion Modeling Engine (SAFAR / NOAA HYSPLIT Style):**
   - **24-Hour Backward Air Provenance Trace:** Numerical $(u, v)$ backward time-integration identifying upwind source sectors (Northwest stubble corridor, Gangetic plain, marine breezes).
   - **18-Hour Forward Dispersion Plume:** Forward transport projection with Taylor turbulent diffusion plume expansion ($\sigma_y \propto \sqrt{t}$).
   - **Meteorological Ventilation Index ($V_I$):** $V_I = \text{WindSpeed (m/s)} \times H_{\text{PBL}} (\text{m})$ categorizing atmospheric trapping into Stagnant ($<6000$), Moderate, or Favorable ($>12000$).
   - **Automated Meteorological Intelligence Bulletins:** Narrative transport analyses and atmospheric boundary layer alerts modeled after official IMD/SAFAR briefs.

4. **Real-Time NAQI Calculation Engine:**
   - Instant live queries for any GPS coordinates in India via Copernicus atmospheric telemetry.
   - Strict implementation of the official Indian Central Pollution Control Board (CPCB) piecewise sub-index formula.

5. **Edge Neural Forecasting (Next 24 Hours):**
   - In-browser multi-step forecasting powered by a lightweight **DLinear** neural network running via WebAssembly/WebGL with $< 15\text{ ms}$ latency and zero cloud costs.
   - Proactive morning temperature inversion surge warnings.

6. **Unmonitored "Air Quality Gap" Explorer:**
   - Click anywhere on the map to query estimated atmospheric exposure and calculate the exact distance to the nearest physical monitoring station.

---

## 🏛️ Project Structure

The codebase is organized into scalable, modular domains:

```text
AtmosQI/
├── dataset/                         # Raw environmental data files
│   ├── AQI-data-past/               # CPCB historical station & city records
│   └── pm25_india_daily_10km_...nc  # 304MB NetCDF gridded satellite model
│
├── scripts/                         # Python data engineering pipelines
│   └── enrich_stations.py           # Geocoding & coordinate synthesis pipeline
│
├── src/                             # Core Web Application (React + Vite)
│   ├── components/                  # Modular UI components
│   │   ├── GoogleMapsOmnibox.jsx    # Floating Google Maps search bar & category chips
│   │   ├── GoogleMapsSideNav.jsx    # Google Maps slide-out menu (layers, tools, models)
│   │   ├── GoogleMapsControls.jsx   # Floating map controls: Zoom, Compass, Layers button
│   │   ├── MapView.jsx              # Leaflet map with custom markers & target radar beacon
│   │   ├── WindOverlay.jsx          # 60fps HTML5 Canvas animated atmospheric wind streamlines
│   │   ├── StationDrawer.jsx        # Google Maps left-docked place card & neural forecast
│   │   ├── TimelinePlayer.jsx       # 2018-2020 Historical time-travel playback scrubber
│   │   ├── Legend.jsx               # Compact Google Maps style AQI scale legend
│   │   └── AboutModal.jsx           # Data provenance & standards documentation
│   │
│   ├── services/                    # Business logic & APIs
│   │   ├── aqiEngine.js             # CPCB piecewise sub-index & NAQI calculation
│   │   ├── geoService.js            # Pan-India universal geocoding & nearest monitor search
│   │   ├── liveAqiService.js        # Open-Meteo & Copernicus live telemetry fetcher
│   │   ├── windService.js           # Real-time atmospheric 10m wind vector interpolation
│   │   └── onnxInference.js         # Local in-browser WebAssembly neural inference engine
│   │
│   ├── constants/                   # Standards, breakpoints & metadata
│   │   └── aqiStandards.js          # CPCB breakpoints, colors, health advisories
│   │
│   ├── styles/
│   │   └── index.css                # Glassmorphic dark theme, animations, tokens
│   │
│   ├── App.jsx                      # Main state container
│   └── main.jsx                     # Entry point
│
├── public/                          # Static assets
│   ├── data/                        # Enriched lightweight JSONs
│   │   ├── stations_enriched.json   # 230 verified stations with GPS coordinates
│   │   ├── sample_timeseries.json   # Historical trend lines for featured stations
│   │   └── timeline_matrix.json     # 913-day historical matrix (2018-2020) with milestones
│   └── models/                      # In-browser edge neural models
│       ├── atmosqi_dlinear_24h.onnx # Trained 3.2KB PyTorch DLinear model
│       └── normalization_params.json
│
├── DATASET_SPECIFICATION.md         # Comprehensive data schemas & data dictionary
├── DEEP_LEARNING_SPECIFICATION.md   # Neural forecasting mathematical specification
├── PAN_INDIA_SPATIAL_AQI_SPECIFICATION.md # Continuous Pan-India spatial estimation & geocoding
├── LICENSE                          # MIT Open-Source License
└── package.json
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js v18+ (tested on v22.16)
- Python 3.9+ (optional, for running data ingestion scripts)

### Installation & Run

```bash
# 1. Install frontend dependencies
npm install

# 2. Start the local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Data Ingestion Pipeline (Optional)

To regenerate or re-enrich the station dataset with new CPCB coordinate feeds:

```bash
python scripts/enrich_stations.py
```

---

## 📜 Documentation & Standards

- **[DATASET_SPECIFICATION.md](DATASET_SPECIFICATION.md):** Complete schemas, physical units, coordinate reference systems (`EPSG:7755`), and CPCB breakpoint formulas.
- **[DEEP_LEARNING_SPECIFICATION.md](DEEP_LEARNING_SPECIFICATION.md):** Mathematical formulation of DLinear decomposition, loss functions, tensor shapes, and ONNX Runtime Web deployment.

---

## 🤝 Contributing

Contributions are warmly welcome! Whether adding new environmental data connectors, refining forecast accuracy, or enhancing map styling:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/NewConnector`).
3. Commit your Changes (`git commit -m 'Add NewConnector'`).
4. Push to the Branch (`git push origin feature/NewConnector`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
