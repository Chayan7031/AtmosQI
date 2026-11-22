# AtmosQI — Open-Source Environmental Data Explorer

## 1. Project Overview

**AtmosQI** is a proposed open-source environmental data platform that makes public environmental datasets easier to discover, understand, visualize, and reuse.

The first version focuses on **air quality in India**. It will use air-pollution data published through India's Open Government Data (OGD) Platform and display monitoring stations and their available observations on an interactive map built with **Leaflet**.

EcoLens aims to help students, researchers, developers, environmental organizations, and interested members of the public explore environmental data without having to independently clean and integrate every dataset.

> **Current scope:** An initial air-quality explorer based on the OGD pollutant dataset already obtained by the project owner. Additional sources and features are planned, not assumed to be implemented.

## 2. Problem Statement

Environmental data is published by multiple organizations and platforms, and datasets may use different column names, formats, units, timestamps, station identifiers, and update schedules. Even when data is publicly available, users may need to spend considerable time locating it, cleaning it, understanding its structure, and preparing it for analysis.

For air-quality data in particular, users need to distinguish between:
- Overall Air Quality Index (AQI) values.
- Measurements of individual pollutants, such as nitrogen dioxide (NO₂), ammonia (NH₃), carbon monoxide (CO), PM₂.₅, and PM₁₀.
- Current observations and historical measurements.
- Direct monitoring-station measurements and model-based estimates.

EcoLens will address this problem by providing a clear map-based interface, consistent data handling, source attribution, and a foundation for reusable environmental-data connectors and APIs.

EcoLens is not intended to replace official monitoring or health guidance. It should clearly communicate data timestamps, sources, units, missing values, and limitations.

## 3. Initial Dataset

The project owner has obtained an air-quality dataset from India's Open Government Data Platform. The supplied sample includes these columns:

| Column | Purpose |
|---|---|
| `country` | Country associated with the record |
| `state` | State or region |
| `city` | City |
| `station` | Monitoring-station name |
| `last_update` | Source-provided update timestamp |
| `latitude` | Station latitude |
| `longitude` | Station longitude |
| `pollutant_id` | Pollutant identifier, e.g. `NO2`, `NH3`, `CO` |
| `pollutant_min` | Minimum reported pollutant value |
| `pollutant_max` | Maximum reported pollutant value |
| `pollutant_avg` | Average reported pollutant value |

### Example records supplied during planning

| City | Station | Pollutant | Minimum | Maximum | Average |
|---|---|---:|---:|---:|---:|
| Patna | IGSC Planetarium Complex, Patna - BSPCB | NO₂ | 3 | 6 | 4 |
| Patna | DRM Office Danapur, Patna - BSPCB | NO₂ | 35 | 40 | 37 |
| Patna | DRM Office Danapur, Patna - BSPCB | NH₃ | 7 | 7 | 7 |
| Patna | Samanpura, Patna - BSPCB | NH₃ | NA | NA | NA |
| Patna | Samanpura, Patna - BSPCB | CO | 38 | 41 | 39 |

These are example records shared during project planning, not verified live observations. The displayed units, averaging periods, and timestamp semantics must be confirmed from the original dataset documentation before interpreting the values.

The sample contains station coordinates, so it can support an initial map. Records with missing measurements should be retained where useful, but missing values such as `NA` must not be treated as zero.

## 4. Goals

1. Display air-quality monitoring stations on an interactive map.
2. Let users filter observations by state, city, station, and pollutant.
3. Present available pollutant measurements with their source, units, and timestamps.
4. Make missing or incomplete data visible rather than silently hiding or changing it.
5. Add official AQI data as a separate source when its fields and access terms are verified.
6. Support historical charts when suitable time-series data is available.
7. Create a maintainable open-source codebase that other contributors can extend.
8. Eventually provide documented APIs and reusable data connectors.

## 5. Proposed Technology Stack

### Initial version

- **React** — user interface.
- **Vite** — frontend development server and build tooling.
- **Leaflet** — interactive map.
- **React Leaflet** — React components for Leaflet.
- **Papa Parse** — parsing CSV files in the browser.
- **CSV** — initial local data source.

### Potential later additions

- **Python + FastAPI** — data ingestion service and public API.
- **PostgreSQL + PostGIS** — structured environmental observations and geographic queries.
- **A charting library** — historical pollutant and AQI trend visualizations.
- Scheduled data import and validation jobs — only where source access and terms permit.

The first prototype does not require a backend or database. Begin with a local CSV file, then introduce additional infrastructure when there is a demonstrated need.

## 6. Initial Architecture

```text
OGD Platform air-quality CSV
             |
             v
     CSV parsing and checks
             |
             v
  Normalize fields and missing values
             |
             v
   React application and data model
             |
       +-----+------+
       |            |
       v            v
 Interactive map   Station details
   (Leaflet)        and filters
```

In a later version, a backend may import data from approved public APIs, validate it, store normalized records, and serve it through documented endpoints.

## 7. Planned Features

### Minimum viable product (MVP)

- Load the existing OGD CSV.
- Display stations using verified latitude and longitude.
- Show station names and location details in map popups.
- Filter records by state, city, and pollutant.
- Show minimum, maximum, and average values when available.
- Display the original observation/update timestamp.
- Indicate missing measurements.
- Identify the dataset source and link to the original resource.
- Provide basic loading and error states.

### Planned enhancements

- Import an official OGD/CPCB AQI dataset after verifying its schema and access method.
- Clearly distinguish overall AQI from individual pollutant readings.
- Add historical charts when dates and historical records support them.
- Compare stations only when the units, averaging periods, and data semantics are compatible.
- Add source-specific import connectors.
- Build a backend API for reusable access to normalized records.
- Add data-quality reports for duplicate records, missing coordinates, invalid values, and stale observations.
- Consider weather context and satellite-derived estimates in later releases, keeping estimates distinct from ground measurements.

## 8. Data Sources and Resources

These resources are candidate sources to investigate. Availability, schema, update frequency, API access, licensing, and reuse terms should be checked before implementation.

### Primary source

- **Open Government Data Platform India:** https://data.gov.in/
- **OGD real-time Air Quality Index catalog:** https://www.data.gov.in/catalog/real-time-air-quality-index

Use the AQI catalog to investigate an official overall-AQI resource and its pollutant details. Confirm which fields are actually supplied by the selected resource. Do not assume every catalog provides the same fields or a continuously available API.

### Additional potential sources

- **OpenAQ API documentation:** https://docs.openaq.org/
- **OpenAQ Explorer:** https://explore.openaq.org/
- **Historical Indian air-quality dataset on Kaggle:** https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india
- **Open-Meteo:** https://open-meteo.com/
- **Open-Meteo Air Quality API documentation:** https://open-meteo.com/en/docs/air-quality-api
- **Leaflet:** https://leafletjs.com/
- **React Leaflet:** https://react-leaflet.js.org/docs/start-installation/
- **Papa Parse:** https://www.papaparse.com/
- **FastAPI:** https://fastapi.tiangolo.com/
- **PostGIS:** https://postgis.net/

Additional sources should be added one at a time, after checking their data quality and compatibility with the existing data model.

## 9. Data Quality and Scientific Integrity

EcoLens should follow these rules:

1. **Preserve provenance:** Record the original provider, resource, and import date for each dataset.
2. **Preserve timestamps:** Do not replace the observation time with the time the data was downloaded.
3. **Confirm units:** Never infer units from a pollutant name alone. Consult the source metadata.
4. **Handle missing values correctly:** Values such as `NA`, blank strings, and null should be treated as missing, not zero.
5. **Keep AQI separate:** Do not calculate an overall AQI by averaging the `pollutant_avg` column across pollutants. Official AQI calculations use defined pollutant-specific rules and breakpoints.
6. **Avoid unsupported comparisons:** Measurements should only be compared when their units, averaging periods, and definitions are compatible.
7. **Handle location carefully:** Use coordinates from the source or a verified station match. Do not invent coordinates from a station name.
8. **Distinguish data types:** Clearly label direct measurements, official AQI values, forecasts, and model-derived estimates.
9. **Show freshness:** Display the source-provided update time and flag data that may be stale.
10. **Keep limitations visible:** EcoLens is an exploration tool, not an official monitoring service or a substitute for public-health advice.

## 10. Map Design

The map will use Leaflet and a suitable basemap. Each station marker should represent a verified monitoring-station location.

Selecting a marker should show:
- Station name.
- City and state.
- Available pollutant identifiers and measurements.
- Units and observation/update time, if supplied.
- Source attribution.
- Data-quality notes where relevant.

A future AQI layer may use categories or colors only when an official AQI value and its applicable category scheme are available. Pollutant concentrations should not be colored using AQI thresholds unless a valid conversion and pollutant-specific standard are applied.

OpenStreetMap-based tiles require appropriate attribution and compliance with the tile provider's usage policy. See: https://www.openstreetmap.org/copyright

## 11. Development Roadmap

### Phase 1 — Inspect and prepare data
- Obtain the original CSV.
- Inspect the real timestamp format and column names.
- Confirm units, measurement definitions, and license.
- Validate coordinates and missing values.

### Phase 2 — Build the map prototype
- Create a React/Vite application.
- Install Leaflet and React Leaflet.
- Load the CSV with Papa Parse.
- Display stations with verified coordinates.
- Add popups and simple filters.

### Phase 3 — Improve data exploration
- Add station detail panels.
- Add clear handling for missing readings.
- Add charts if the data supports historical analysis.
- Show source links and data freshness.

### Phase 4 — Add official AQI data
- Inspect the OGD/CPCB AQI resource.
- Determine whether it includes overall AQI, pollutant-specific values, timestamps, and station identifiers.
- Create a separate source connector.
- Match stations only with reliable identifiers or verified coordinates.
- Avoid presenting historical or stale data as live.

### Phase 5 — Prepare for open-source contributions
- Publish a clear README and setup guide.
- Add tests for CSV parsing and normalization.
- Document the data schema and known limitations.
- Add contribution guidelines and issue templates.
- Record software and dataset licenses separately.

## 12. Open-Source Plan

EcoLens is intended to be an open-source project that other developers can inspect, use, and improve.

A permissive license such as **MIT** may suit the codebase if broad reuse is the goal. This is a proposed choice, not a license already applied. Before publishing, add the selected license file and check the licenses and attribution requirements of every dataset, map tile service, dependency, and external API.

Potential contribution areas:
- New environmental data connectors.
- CSV validation and normalization.
- Map and chart improvements.
- Documentation and tutorials.
- Tests and accessibility improvements.
- Support for additional regions and languages.

## 13. Repository Structure (Proposed)

```text
ecolens/
├── public/
│   └── data/
│       └── air-quality.csv
├── src/
│   ├── components/
│   │   ├── MapView.jsx
│   │   ├── StationDetails.jsx
│   │   └── FilterPanel.jsx
│   ├── data/
│   │   └── normalizeAirQuality.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── tests/
├── docs/
│   └── data-sources.md
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── package.json
```

This structure is a starting proposal and can change as the project grows.

## 14. Definition of Success for the First Release

The first release is successful when a user can:

- Run EcoLens locally using documented instructions.
- Load the selected OGD dataset without corrupting missing values.
- View verified stations on the Leaflet map.
- Filter observations by pollutant and location.
- Inspect the values, timestamp, units, and source for a station.
- Understand whether the displayed information is a pollutant measurement or an overall AQI value.
- Trace displayed data back to its original source.

## 15. Current Status and Open Questions

### Known from project planning
- Project name: EcoLens.
- Intended model: open-source environmental data explorer.
- Initial focus: air quality in India.
- Initial data source: OGD Platform India.
- Mapping library: Leaflet.
- Sample fields include location, station, timestamp, coordinates, pollutant identifier, and minimum/maximum/average pollutant values.

### Still to verify
- Exact dataset resource URL and license.
- Actual timestamp values (the spreadsheet sample showed `########`).
- Units and averaging period for each pollutant.
- Whether the selected AQI resource provides overall AQI and which station identifiers it uses.
- Whether a reliable station identifier exists across the datasets.
- Whether the source supports API access for the chosen resource.

---

**EcoLens mission:** Make environmental data easier to find, understand, map, and reuse — starting with air quality in India.
