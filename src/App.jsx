import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import MapView from './components/MapView';
import TacticalHUDOverlay from './components/TacticalHUDOverlay';
import TacticalBottomDeck from './components/TacticalBottomDeck';
import StationDrawer from './components/StationDrawer';
import Legend from './components/Legend';
import AboutModal from './components/AboutModal';
import CalculationExplainerModal from './components/CalculationExplainerModal';
import { fetchLiveAirQuality } from './services/liveAqiService';
import { findNearestStation } from './services/geoService';
import { interpolateWindVector } from './services/windService';
import { computeBackwardTrajectory, computeForwardDispersion } from './services/advectionEngine';
import './styles/hud.css';

export default function App() {
  const [stations, setStations] = useState([]);
  const [timeseriesCache, setTimeseriesCache] = useState({});
  const [selectedStation, setSelectedStation] = useState(null);
  const [liveLocationData, setLiveLocationData] = useState(null);
  const [targetLocation, setTargetLocation] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Atmospheric Wind & Trajectory Engine
  const [windField, setWindField] = useState(null);
  const [activeTrajectory, setActiveTrajectory] = useState(null);

  // Tactical Modes & Modals
  const [activeMode, setActiveMode] = useState('stations'); // 'stations' | 'satellite'
  const [isWindActive, setIsWindActive] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Tactical Filters & Equalizer Sliders
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBucket, setSelectedBucket] = useState('ALL');
  const [aqiCeiling, setAqiCeiling] = useState(500);
  const [windThreshold, setWindThreshold] = useState(12);

  // React 19 Deferred Values to eliminate slider dragging and typing lag
  const deferredSearch = useDeferredValue(searchQuery);
  const deferredCeiling = useDeferredValue(aqiCeiling);
  const deferredBucket = useDeferredValue(selectedBucket);

  // 1. Fetch Enriched CPCB Stations & Timeseries
  useEffect(() => {
    async function loadData() {
      try {
        const [stationsRes, timeseriesRes] = await Promise.all([
          fetch('/data/stations_enriched.json'),
          fetch('/data/sample_timeseries.json').catch(() => null)
        ]);

        if (stationsRes.ok) {
          const stationsData = await stationsRes.json();
          setStations(stationsData);
        }
        if (timeseriesRes && timeseriesRes.ok) {
          const tsData = await timeseriesRes.json();
          setTimeseriesCache(tsData);
        }
      } catch (err) {
        console.error("Failed to load initial dataset:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. High-Performance Deferred Filter (Prevents Leaflet lag during slider drag)
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      if (deferredSearch) {
        const q = deferredSearch.toLowerCase();
        const matchesName = station.name?.toLowerCase().includes(q);
        const matchesCity = station.city?.toLowerCase().includes(q);
        const matchesId = station.id?.toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesId) return false;
      }

      if (deferredBucket !== 'ALL') {
        const bucket = station.latest?.aqi_bucket;
        if (bucket !== deferredBucket) return false;
      }

      if (station.latest?.aqi && station.latest.aqi > deferredCeiling) {
        return false;
      }

      return true;
    });
  }, [stations, deferredSearch, deferredBucket, deferredCeiling]);

  // Peak AQI calculation for Top-Right HUD Gauge
  const peakAqi = useMemo(() => {
    let maxVal = 219;
    for (const s of stations) {
      if (s.latest?.aqi && s.latest.aqi > maxVal) {
        maxVal = s.latest.aqi;
      }
    }
    return maxVal;
  }, [stations]);

  // 3. Geolocation: "My Live Air"
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setTargetLocation({ lat: latitude, lon: longitude, name: 'My Current Location' });
        mapInstance?.flyTo([latitude, longitude], 12, { duration: 1.0 });

        const liveResult = await fetchLiveAirQuality(latitude, longitude);
        setIsLocating(false);

        if (liveResult.success) {
          const nearest = findNearestStation(latitude, longitude, stations);
          setLiveLocationData({
            ...liveResult,
            locationName: 'My Current Location',
            locationSubtitle: `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`,
            nearestStation: nearest
          });
          setSelectedStation(null);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation permission denied, falling back to Delhi NCR:", err);
        handleMapClickLocation(28.6139, 77.2090);
      },
      { timeout: 8000 }
    );
  };

  // 4. Handle Universal Search Place Selection
  const handleSelectUniversalPlace = async (place) => {
    const { latitude, longitude, title, subtitle } = place;
    setSelectedStation(null);
    setTargetLocation({ lat: latitude, lon: longitude, name: title });
    mapInstance?.flyTo([latitude, longitude], 12, { duration: 1.0 });
    setIsLocating(true);

    const liveResult = await fetchLiveAirQuality(latitude, longitude);
    setIsLocating(false);

    if (liveResult.success) {
      const nearest = findNearestStation(latitude, longitude, stations);
      setLiveLocationData({
        ...liveResult,
        locationName: title,
        locationSubtitle: subtitle,
        nearestStation: nearest
      });
    }
  };

  // 5. Handle Map Click on Any Coordinate in India
  const handleMapClickLocation = async (lat, lon) => {
    setSelectedStation(null);
    const nearest = findNearestStation(lat, lon, stations);
    setTargetLocation({
      lat,
      lon,
      name: nearest ? `Near ${nearest.city || nearest.name.split(',')[0]}` : `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`
    });
    setIsLocating(true);

    const liveResult = await fetchLiveAirQuality(lat, lon);
    setIsLocating(false);

    if (liveResult.success) {
      setLiveLocationData({
        ...liveResult,
        locationName: nearest ? `Near ${nearest.city || nearest.name.split(',')[0]}` : 'Selected Coordinates',
        locationSubtitle: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
        nearestStation: nearest
      });
    }
  };

  // 6. Handle Station Selection
  const handleSelectStation = useCallback(async (station) => {
    setSelectedStation(station);
    if (station.latitude && station.longitude) {
      setTargetLocation({ lat: station.latitude, lon: station.longitude, name: station.name });
      mapInstance?.flyTo([station.latitude, station.longitude], 13, { duration: 1.0 });

      const liveResult = await fetchLiveAirQuality(station.latitude, station.longitude);
      if (liveResult.success) {
        setLiveLocationData({
          ...liveResult,
          locationName: station.name,
          locationSubtitle: `${station.city}, ${station.state} • CPCB Ground Node`,
          nearestStation: station
        });
      }
    }
  }, [mapInstance]);

  const handleCloseDrawer = () => {
    setSelectedStation(null);
    setLiveLocationData(null);
  };

  const handleCenterLocation = (lat, lon) => {
    mapInstance?.flyTo([lat, lon], 13, { duration: 1.0 });
  };

  // 7. Trajectory Modeling Handlers
  const handleComputeTrajectory = useCallback((type, lat, lon) => {
    if (!lat || !lon) return;
    if (type === 'backward') {
      const traj = computeBackwardTrajectory(lat, lon, windField, 24);
      setActiveTrajectory(traj);
    } else if (type === 'forward') {
      const traj = computeForwardDispersion(lat, lon, windField, 18);
      setActiveTrajectory(traj);
    }
  }, [windField]);

  const handleClearTrajectory = useCallback(() => {
    setActiveTrajectory(null);
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#040a14',
      fontFamily: "'Space Mono', monospace"
    }}>
      {/* 1. Tactical Leaflet GIS Map Canvas */}
      <MapView
        stations={filteredStations}
        selectedStation={selectedStation}
        onSelectStation={handleSelectStation}
        activeMode={activeMode}
        onMapClickLocation={handleMapClickLocation}
        targetLocation={targetLocation}
        onMapReady={setMapInstance}
        isWindActive={isWindActive}
      />

      {/* 2. Top Tactical HUD: System Code, Target Ring, Omnibox, Modes, 63,224 Telemetry Readout */}
      <TacticalHUDOverlay
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        allStations={stations}
        onSelectStation={handleSelectStation}
        onSelectUniversalPlace={handleSelectUniversalPlace}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        isWindActive={isWindActive}
        onToggleWind={setIsWindActive}
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        onOpenAbout={() => setIsAboutOpen(true)}
        stationCount={stations.length}
        peakAqi={peakAqi}
      />

      {/* 3. Sliding Inspection Drawer */}
      {(selectedStation || liveLocationData) && (
        <StationDrawer
          station={selectedStation}
          liveData={liveLocationData}
          onClose={handleCloseDrawer}
          timeseriesCache={timeseriesCache}
          onCenterLocation={handleCenterLocation}
          onComputeTrajectory={handleComputeTrajectory}
          activeTrajectory={activeTrajectory}
          onClearTrajectory={handleClearTrajectory}
          windField={windField}
          allStations={stations}
        />
      )}

      {/* 4. Tactical Bottom Command Deck (Directly Matching Reference Image) */}
      <TacticalBottomDeck
        selectedStation={selectedStation}
        liveData={liveLocationData}
        allStations={stations}
        windField={windField}
        selectedBucket={selectedBucket}
        onSelectBucket={setSelectedBucket}
        aqiCeiling={aqiCeiling}
        onAqiCeilingChange={setAqiCeiling}
        windThreshold={windThreshold}
        onWindThresholdChange={setWindThreshold}
        isWindActive={isWindActive}
        onToggleWind={setIsWindActive}
      />

      {/* 5. Compact Tactical Legend (Above Bottom Deck) */}
      <Legend style={{ bottom: 220, right: 14 }} />

      {/* 6. Modals */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <CalculationExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* 7. Loading Screen */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(4, 10, 20, 0.96)',
          zIndex: 4000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px solid rgba(34, 211, 238, 0.2)',
            borderTopColor: '#22d3ee',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', letterSpacing: '0.12em' }}>
            INITIALIZING TACTICAL AIRSPACE // CPCB PAN-INDIA MATRIX...
          </span>
        </div>
      )}
    </div>
  );
}
