import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import GoogleMapsOmnibox from './components/GoogleMapsOmnibox';
import GoogleMapsSideNav from './components/GoogleMapsSideNav';
import GoogleMapsControls from './components/GoogleMapsControls';
import StationDrawer from './components/StationDrawer';
import Legend from './components/Legend';
import AboutModal from './components/AboutModal';
import TimelinePlayer from './components/TimelinePlayer';
import { fetchLiveAirQuality } from './services/liveAqiService';
import { findNearestStation } from './services/geoService';
import { computeBackwardTrajectory, computeForwardDispersion } from './services/advectionEngine';

export default function App() {
  const [stations, setStations] = useState([]);
  const [timeseriesCache, setTimeseriesCache] = useState({});
  const [timelineData, setTimelineData] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [liveLocationData, setLiveLocationData] = useState(null);
  const [targetLocation, setTargetLocation] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Atmospheric Wind & Trajectory Engine
  const [windField, setWindField] = useState(null);
  const [activeTrajectory, setActiveTrajectory] = useState(null); // { type, waypoints, originSector?, ... }

  // Modes & Modals
  const [activeMode, setActiveMode] = useState('stations'); // 'stations' | 'satellite' | 'timeline'
  const [isWindActive, setIsWindActive] = useState(true); // Atmospheric wind streamlines
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Filters (for Ground Stations mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedBucket, setSelectedBucket] = useState('ALL');

  // Timeline State (2018 - 2020)
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x, 8x

  // 1. Fetch Enriched Stations, Sample Timeseries, and Timeline Matrix
  useEffect(() => {
    async function loadData() {
      try {
        const [stationsRes, timeseriesRes, timelineRes] = await Promise.all([
          fetch('/data/stations_enriched.json'),
          fetch('/data/sample_timeseries.json').catch(() => null),
          fetch('/data/timeline_matrix.json').catch(() => null)
        ]);

        if (stationsRes.ok) {
          const stationsData = await stationsRes.json();
          setStations(stationsData);
        }
        if (timeseriesRes && timeseriesRes.ok) {
          const tsData = await timeseriesRes.json();
          setTimeseriesCache(tsData);
        }
        if (timelineRes && timelineRes.ok) {
          const tlData = await timelineRes.json();
          setTimelineData(tlData);
          const anomalyIdx = tlData.dates.indexOf('2020-04-15');
          if (anomalyIdx !== -1) {
            setTimelineIndex(anomalyIdx);
          }
        }
      } catch (err) {
        console.error("Failed to load initial dataset:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Automated 60fps Playback Engine
  useEffect(() => {
    if (!isPlaying || activeMode !== 'timeline' || !timelineData || !timelineData.dates) {
      return;
    }

    const intervalMs = Math.max(20, Math.round(180 / playbackSpeed));
    const timer = setInterval(() => {
      setTimelineIndex((prev) => {
        if (prev >= timelineData.dates.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, activeMode, timelineData, playbackSpeed]);

  // 3. Spacebar Play/Pause & Arrow Key Scrubbing Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeMode !== 'timeline' || !timelineData) return;
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setTimelineIndex((prev) => Math.max(0, prev - (e.shiftKey ? 7 : 1)));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setTimelineIndex((prev) => Math.min(timelineData.dates.length - 1, prev + (e.shiftKey ? 7 : 1)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, timelineData]);

  // 4. Extract Available States
  const availableStates = useMemo(() => {
    const statesSet = new Set(stations.map(s => s.state).filter(Boolean));
    return Array.from(statesSet).sort();
  }, [stations]);

  // 5. Filtered Stations (Live Mode)
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = station.name?.toLowerCase().includes(q);
        const matchesCity = station.city?.toLowerCase().includes(q);
        const matchesId = station.id?.toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesId) return false;
      }

      if (selectedState !== 'ALL' && station.state !== selectedState) {
        return false;
      }

      if (selectedBucket !== 'ALL') {
        const bucket = station.latest?.aqi_bucket;
        if (bucket !== selectedBucket) return false;
      }

      return true;
    });
  }, [stations, searchQuery, selectedState, selectedBucket]);

  // 6. Handle Geolocation: "My Live Air"
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
        } else {
          alert("Could not fetch live atmospheric data for your coordinates.");
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation permission denied or timed out:", err);
        handleMapClickLocation(28.6139, 77.2090);
      },
      { timeout: 8000 }
    );
  };

  // 7. Handle Universal Search Place Selection (Google Maps-Style)
  const handleSelectUniversalPlace = async (place) => {
    const { latitude, longitude, title, subtitle } = place;
    setSelectedStation(null);
    setTargetLocation({ lat: latitude, lon: longitude, name: title });
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

  // 8. Handle Click on Any Point on Map (Unmonitored Gap Explorer)
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

  const handleSelectStation = useCallback(async (station) => {
    setSelectedStation(station);
    if (station.latitude && station.longitude) {
      setTargetLocation({ lat: station.latitude, lon: station.longitude, name: station.name });
      // Immediately fetch live real-time air quality telemetry for this station
      const liveResult = await fetchLiveAirQuality(station.latitude, station.longitude);
      if (liveResult.success) {
        setLiveLocationData({
          ...liveResult,
          locationName: station.name,
          locationSubtitle: `${station.city}, ${station.state} • CPCB Ground Monitor`,
          nearestStation: station
        });
      }
    }
  }, []);

  const handleCloseDrawer = () => {
    setSelectedStation(null);
    setLiveLocationData(null);
  };

  const handleSelectMilestone = (m) => {
    setIsPlaying(false);
  };

  // Map Controls Helpers
  const handleZoomIn = () => {
    mapInstance?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstance?.zoomOut();
  };

  const handleResetView = () => {
    mapInstance?.flyTo([22.8, 80.5], 5, { duration: 1.2 });
  };

  const handleCenterLocation = (lat, lon) => {
    mapInstance?.flyTo([lat, lon], 13, { duration: 1.2 });
  };

  // 9. Lagrangian Trajectory Modeling Handlers
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
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#080C14' }}>
      {/* 1. Google Maps Fullscreen Base Map */}
      <MapView
        stations={filteredStations}
        selectedStation={selectedStation}
        onSelectStation={handleSelectStation}
        activeMode={activeMode}
        onMapClickLocation={handleMapClickLocation}
        timelineData={timelineData}
        timelineIndex={timelineIndex}
        targetLocation={targetLocation}
        onMapReady={setMapInstance}
        isWindActive={isWindActive}
        onWindLoaded={setWindField}
        activeTrajectory={activeTrajectory}
        onClearTrajectory={handleClearTrajectory}
      />

      {/* 2. Floating Top-Left Google Maps Omnibox & Filter Chips (Visible when details drawer is closed) */}
      {!selectedStation && !liveLocationData && activeMode !== 'timeline' && (
        <GoogleMapsOmnibox
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          selectedBucket={selectedBucket}
          setSelectedBucket={setSelectedBucket}
          availableStates={availableStates}
          allStations={stations}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          onSelectStation={handleSelectStation}
          onSelectUniversalPlace={handleSelectUniversalPlace}
          onLocateUser={handleLocateUser}
          isLocating={isLocating}
          onOpenMenu={() => setIsSideNavOpen(true)}
          isWindActive={isWindActive}
          onToggleWind={setIsWindActive}
        />
      )}

      {/* 3. Google Maps Side Navigation Drawer Menu (Opened via Hamburger Menu) */}
      <GoogleMapsSideNav
        isOpen={isSideNavOpen}
        onClose={() => setIsSideNavOpen(false)}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onLocateUser={handleLocateUser}
        onResetView={handleResetView}
        onOpenAbout={() => setIsAboutOpen(true)}
        stationCount={stations.length}
        isWindActive={isWindActive}
        onToggleWind={setIsWindActive}
      />

      {/* 4. Google Maps Left-Docked Place / Station Details Panel */}
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

      {/* 5. Google Maps Floating Controls: Bottom-Left Layers & Bottom-Right Zoom/Compass/GPS */}
      {activeMode !== 'timeline' && (
        <GoogleMapsControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          onLocateUser={handleLocateUser}
          isLocating={isLocating}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          stationCount={stations.length}
          isWindActive={isWindActive}
          onToggleWind={setIsWindActive}
        />
      )}

      {/* 6. Clean Google Maps Style AQI Legend (Bottom-Right) */}
      {activeMode !== 'timeline' && <Legend />}

      {/* 7. Interactive Time-Travel Playback Scrubber (Docked at Bottom in Timeline Mode) */}
      {activeMode === 'timeline' && timelineData && (
        <TimelinePlayer
          timelineData={timelineData}
          currentIndex={timelineIndex}
          onIndexChange={setTimelineIndex}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          speed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          onClose={() => {
            setActiveMode('stations');
            setIsPlaying(false);
          }}
          onSelectMilestone={handleSelectMilestone}
        />
      )}

      {/* 8. About & Standards Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* 9. Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8, 12, 20, 0.95)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '3px solid rgba(6, 182, 212, 0.2)',
            borderTopColor: '#06B6D4',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', fontFamily: 'var(--font-display)' }}>
            Loading AtmosQI Maps & Atmospheric Registry...
          </span>
        </div>
      )}
    </div>
  );
}
