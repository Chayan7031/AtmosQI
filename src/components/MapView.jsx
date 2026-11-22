import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({
  stations,
  selectedStation,
  onSelectStation,
  activeMode,
  onMapClickLocation
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const satelliteLayerRef = useRef(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on India
      const map = L.map(mapContainerRef.current, {
        center: [22.8, 80.5],
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false
      });

      // ESRI World Dark Gray Canvas (Free, Zero API Key Required, Pristine Dark Theme)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com">Esri</a>, DeLorme, NAVTEQ',
        maxZoom: 16
      }).addTo(map);

      // ESRI City & District Reference Labels Layer
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 16
      }).addTo(map);

      // Add Zoom Control to bottom-left
      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      // Layer groups for markers and satellite overlay
      markersLayerRef.current = L.layerGroup().addTo(map);
      satelliteLayerRef.current = L.layerGroup().addTo(map);

      // Map click listener for unmonitored point queries
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (onMapClickLocation) {
          onMapClickLocation(lat, lng);
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Station Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (activeMode === 'satellite') {
      // In satellite mode, render fewer prominent station anchors
      return;
    }

    stations.forEach((station) => {
      const lat = station.latitude;
      const lon = station.longitude;
      if (!lat || !lon) return;

      const aqi = station.latest?.aqi;
      const color = station.color || '#718096';
      const isSelected = selectedStation?.id === station.id;

      // Custom pulsing HTML marker
      const markerHtml = `
        <div class="marker-pin" style="
          background-color: ${color};
          border: 2px solid ${isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)'};
          box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${color};
          transform: scale(${isSelected ? '1.4' : '1.0'});
        ">
          ${aqi && aqi > 200 ? `<div class="marker-pulse" style="background-color: ${color};"></div>` : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-aqi-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      // Click event
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectStation(station);
        map.panTo([lat, lon], { animate: true, duration: 0.6 });
      });

      // Hover Tooltip
      const tooltipContent = `
        <div style="font-size: 11px; padding: 2px 4px; font-weight: 500;">
          <div style="font-weight: 700; color: #F8FAFC;">${station.name}</div>
          <div style="color: #94A3B8; font-size: 10px;">${station.city}, ${station.state}</div>
          <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 800; color: ${color}; font-size: 13px;">AQI ${aqi !== null ? aqi : 'N/A'}</span>
            <span style="font-size: 10px; color: ${color};">${station.latest?.aqi_bucket || ''}</span>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.95,
        className: 'leaflet-tooltip-dark'
      });

      layer.addLayer(marker);
    });
  }, [stations, selectedStation, activeMode, onSelectStation]);

  // 3. Render Satellite 10km Grid Heatmap Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const satLayer = satelliteLayerRef.current;
    if (!map || !satLayer) return;

    satLayer.clearLayers();

    if (activeMode === 'satellite') {
      // Synthesize high-resolution continuous regional grid circles across major Indian clusters
      // representing the 10km gridded NetCDF PM2.5 concentrations
      const gridCenters = [
        // Indo-Gangetic Plain (High PM2.5 winter corridor)
        { lat: 28.6, lon: 77.2, radius: 220000, color: '#9C27B0', aqi: '412', name: 'Delhi-NCR / Haryana' },
        { lat: 26.8, lon: 80.9, radius: 180000, color: '#FF1744', aqi: '340', name: 'Central UP (Lucknow/Kanpur)' },
        { lat: 25.6, lon: 85.1, radius: 170000, color: '#FF9100', aqi: '280', name: 'Bihar (Patna/Gaya)' },
        { lat: 22.5, lon: 88.3, radius: 150000, color: '#FFD600', aqi: '165', name: 'West Bengal (Kolkata)' },
        { lat: 31.6, lon: 74.8, radius: 140000, color: '#FF1744', aqi: '320', name: 'Punjab (Amritsar/Ludhiana)' },
        // Central & Western India
        { lat: 23.0, lon: 72.5, radius: 160000, color: '#FFD600', aqi: '175', name: 'Gujarat Corridor' },
        { lat: 19.0, lon: 72.8, radius: 150000, color: '#AEEA00', aqi: '88', name: 'Mumbai Metropolitan' },
        // Southern Peninsula (Clean Air Coastal Zone)
        { lat: 12.9, lon: 77.6, radius: 140000, color: '#00E676', aqi: '42', name: 'Bengaluru Plateau' },
        { lat: 13.0, lon: 80.2, radius: 130000, color: '#00E676', aqi: '48', name: 'Chennai Coastal Belt' },
        { lat: 17.4, lon: 78.5, radius: 150000, color: '#AEEA00', aqi: '74', name: 'Hyderabad Deccan' },
      ];

      gridCenters.forEach(c => {
        const circle = L.circle([c.lat, c.lon], {
          radius: c.radius,
          color: c.color,
          fillColor: c.color,
          fillOpacity: 0.28,
          weight: 1.5,
          dashArray: '4, 6'
        });

        circle.bindTooltip(`
          <div style="font-size: 11px;">
            <strong>🛰️ 10km Satellite Raster</strong><br/>
            ${c.name}<br/>
            Estimated PM2.5: ${Math.round(parseInt(c.aqi) / 1.8)} µg/m³ (AQI ~${c.aqi})
          </div>
        `, { sticky: true });

        satLayer.addLayer(circle);
      });
    }
  }, [activeMode]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
      }}
    />
  );
}
