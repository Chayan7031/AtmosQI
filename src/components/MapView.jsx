import React, { useEffect, useRef, useState, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import WindOverlay from './WindOverlay';

function MapView({
  stations = [],
  selectedStation,
  onSelectStation,
  activeMode,
  onMapClickLocation,
  targetLocation,
  onMapReady,
  isWindActive
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const markersGroupRef = useRef(null);
  const markersMapRef = useRef(new Map()); // station.id -> L.marker
  const satelliteLayerRef = useRef(null);
  const targetBeaconRef = useRef(null);

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on India with seamless view
      const map = L.map(mapContainerRef.current, {
        center: [22.8, 80.5],
        zoom: 5,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        preferCanvas: true // GPU-accelerated canvas rendering for Leaflet vectors
      });

      // Photorealistic Satellite Topography (Emerald Vegetation & Sandy Deserts)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com">Esri</a>, Earthstar Geographics, CPCB',
        maxZoom: 17,
        className: 'tactical-satellite-tiles'
      }).addTo(map);

      // Subtle Boundaries and Geographic Reference Labels
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 16,
        opacity: 0.6,
        className: 'tactical-reference-tiles'
      }).addTo(map);

      // Zoom Control in bottom-left
      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      // Layer groups
      markersGroupRef.current = L.layerGroup().addTo(map);
      satelliteLayerRef.current = L.layerGroup().addTo(map);
      targetBeaconRef.current = L.layerGroup().addTo(map);

      // Map click listener for unmonitored point queries
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (onMapClickLocation) {
          onMapClickLocation(lat, lng);
        }
      });

      mapInstanceRef.current = map;
      setMapInstance(map);
      if (onMapReady) {
        onMapReady(map);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapInstance(null);
      }
    };
  }, []);

  // 2. Optimized Station Markers (Diffing & Recycling instead of full recreate)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    if (activeMode === 'satellite') {
      group.clearLayers();
      markersMapRef.current.clear();
      return;
    }

    const currentMap = markersMapRef.current;
    const activeIds = new Set();

    stations.forEach((station) => {
      const lat = station.latitude;
      const lon = station.longitude;
      if (!lat || !lon) return;

      activeIds.add(station.id);
      const isSelected = selectedStation?.id === station.id;
      const aqi = station.latest?.aqi;
      const color = station.color || (aqi > 200 ? '#f97316' : aqi > 100 ? '#eab308' : '#10b981');

      if (currentMap.has(station.id)) {
        // Update existing marker icon if selection state changed
        const existingMarker = currentMap.get(station.id);
        if (existingMarker._isSelected !== isSelected) {
          existingMarker._isSelected = isSelected;
          const markerHtml = `
            <div class="hud-marker ${isSelected ? 'selected' : ''}" style="
              width: ${isSelected ? '16px' : '12px'};
              height: ${isSelected ? '16px' : '12px'};
              border-radius: 50%;
              background: ${color};
              border: ${isSelected ? '2px solid #22d3ee' : '1.5px solid rgba(255,255,255,0.7)'};
              box-shadow: 0 0 ${isSelected ? '14px #22d3ee' : '6px ' + color};
              cursor: pointer;
              position: relative;
            ">
              ${aqi && aqi > 200 ? `<div class="marker-hazard-pulse" style="border-color: ${color};"></div>` : ''}
            </div>
          `;
          existingMarker.setIcon(L.divIcon({
            html: markerHtml,
            className: 'tactical-marker-icon',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          }));
        }
      } else {
        // Create new marker
        const markerHtml = `
          <div class="hud-marker ${isSelected ? 'selected' : ''}" style="
            width: ${isSelected ? '16px' : '12px'};
            height: ${isSelected ? '16px' : '12px'};
            border-radius: 50%;
            background: ${color};
            border: ${isSelected ? '2px solid #22d3ee' : '1.5px solid rgba(255,255,255,0.7)'};
            box-shadow: 0 0 ${isSelected ? '14px #22d3ee' : '6px ' + color};
            cursor: pointer;
            position: relative;
          ">
            ${aqi && aqi > 200 ? `<div class="marker-hazard-pulse" style="border-color: ${color};"></div>` : ''}
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'tactical-marker-icon',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([lat, lon], { icon: customIcon });
        marker._isSelected = isSelected;

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelectStation) {
            onSelectStation(station);
          }
          map.panTo([lat, lon], { animate: true, duration: 0.5 });
        });

        marker.bindTooltip(`
          <div style="
            background: #06101d;
            border: 1px solid #22d3ee;
            box-shadow: 0 0 10px rgba(34, 211, 238, 0.3);
            padding: 5px 8px;
            font-family: monospace;
            color: #f1f5f9;
            font-size: 11px;
          ">
            <div style="font-weight: 700; color: #22d3ee;">${station.name}</div>
            <div style="color: #94a3b8; font-size: 10px;">${station.city}, ${station.state}</div>
            <div style="margin-top: 3px; display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 800; color: ${color}; font-size: 12px;">AQI ${aqi ?? 'N/A'}</span>
              <span style="font-size: 9px; color: ${color}; border: 1px solid ${color}; padding: 0 3px;">${station.latest?.aqi_bucket || ''}</span>
            </div>
          </div>
        `, {
          direction: 'top',
          offset: [0, -8],
          opacity: 0.95
        });

        group.addLayer(marker);
        currentMap.set(station.id, marker);
      }
    });

    // Remove stale markers not in activeIds
    for (const [id, marker] of currentMap.entries()) {
      if (!activeIds.has(id)) {
        group.removeLayer(marker);
        currentMap.delete(id);
      }
    }
  }, [stations, selectedStation, activeMode, onSelectStation]);

  // 3. Render Tactical Radar Target Beacon
  useEffect(() => {
    const map = mapInstanceRef.current;
    const beaconLayer = targetBeaconRef.current;
    if (!map || !beaconLayer) return;

    beaconLayer.clearLayers();

    const target = targetLocation || (selectedStation ? { lat: selectedStation.latitude, lon: selectedStation.longitude } : null);
    if (!target || !target.lat || !target.lon) return;

    const beaconHtml = `
      <div style="position: relative; width: 44px; height: 44px; pointer-events: none;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid #22d3ee;
          box-shadow: 0 0 12px #22d3ee;
          animation: beacon-ripple 2s infinite ease-out;
        "></div>
        <div style="
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          border: 1px dashed #10b981;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 6px;
          height: 6px;
          margin-top: -3px;
          margin-left: -3px;
          background: #22d3ee;
          border-radius: 50%;
          box-shadow: 0 0 6px #22d3ee;
        "></div>
      </div>
    `;

    const beaconIcon = L.divIcon({
      html: beaconHtml,
      className: 'target-radar-beacon',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const beaconMarker = L.marker([target.lat, target.lon], { icon: beaconIcon, zIndexOffset: 1000 });
    beaconLayer.addLayer(beaconMarker);
  }, [targetLocation, selectedStation]);

  // 4. Render Satellite 10km Grid Heatmap Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const satLayer = satelliteLayerRef.current;
    if (!map || !satLayer) return;

    satLayer.clearLayers();

    if (activeMode === 'satellite') {
      const gridCenters = [
        { lat: 28.6, lon: 77.2, radius: 220000, color: '#f97316', aqi: '412', name: 'Indo-Gangetic Basin (Delhi-NCR)' },
        { lat: 26.8, lon: 80.9, radius: 180000, color: '#ea580c', aqi: '340', name: 'Uttar Pradesh Central Corridor' },
        { lat: 25.6, lon: 85.1, radius: 170000, color: '#eab308', aqi: '280', name: 'Bihar Agricultural Belt' },
        { lat: 22.5, lon: 88.3, radius: 150000, color: '#10b981', aqi: '165', name: 'Bengal Coastal Gateway' },
        { lat: 31.6, lon: 74.8, radius: 140000, color: '#ea580c', aqi: '320', name: 'Punjab Farm Emission Zone' },
        { lat: 23.0, lon: 72.5, radius: 160000, color: '#eab308', aqi: '175', name: 'Gujarat Industrial Belt' },
        { lat: 19.0, lon: 72.8, radius: 150000, color: '#10b981', aqi: '88', name: 'Mumbai Western Seaboard' },
        { lat: 12.9, lon: 77.6, radius: 140000, color: '#10b981', aqi: '42', name: 'Deccan South Plateau' },
        { lat: 13.0, lon: 80.2, radius: 130000, color: '#10b981', aqi: '48', name: 'Coromandel Coastal Zone' },
        { lat: 17.4, lon: 78.5, radius: 150000, color: '#10b981', aqi: '74', name: 'Hyderabad Central Basin' },
      ];

      gridCenters.forEach(c => {
        const circle = L.circle([c.lat, c.lon], {
          radius: c.radius,
          color: c.color,
          fillColor: c.color,
          fillOpacity: 0.22,
          weight: 1.5,
          dashArray: '3, 6'
        });

        circle.bindTooltip(`
          <div style="background: #06101d; border: 1px solid #22d3ee; padding: 5px 8px; font-family: monospace; color: #f1f5f9;">
            <strong style="color: #22d3ee;">🛰️ 10KM SATELLITE RASTER</strong><br/>
            ${c.name}<br/>
            Estimated PM2.5: ${Math.round(parseInt(c.aqi) / 1.8)} µg/m³ (AQI ~${c.aqi})
          </div>
        `, { sticky: true });

        satLayer.addLayer(circle);
      });
    }
  }, [activeMode]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: '#040a14' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />

      {/* 5. 60 FPS Atmospheric Wind Particle Streamlines Overlay */}
      {mapInstance && <WindOverlay map={mapInstance} isActive={isWindActive} />}

      <style>{`
        /* Topographic Relief Satellite Filter matching Reference Image */
        .tactical-satellite-tiles {
          filter: brightness(0.65) contrast(1.35) saturate(1.3) hue-rotate(-5deg);
        }
        .tactical-reference-tiles {
          filter: brightness(0.9) contrast(1.2);
        }
        @keyframes beacon-ripple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .marker-hazard-pulse {
          position: absolute;
          top: -4px;
          left: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid #f97316;
          animation: beacon-ripple 1.8s infinite ease-out;
        }
        .leaflet-container {
          background: #040a14 !important;
        }
      `}</style>
    </div>
  );
}

export default memo(MapView);
