/**
 * AtmosQI — Lagrangian Trajectory & Advection Engine
 * Models backward provenance trace, forward dispersion plumes, and ventilation index.
 */

import { interpolateWindVector, getCardinalDirection } from './windService.js';

export function calculateVentilationIndex(windSpeedMs, pblHeightMeters = 850) {
  // Ventilation Index (VI) = Wind Speed (m/s) * Planetary Boundary Layer Height (m)
  const speed = Math.max(0.5, windSpeedMs || 2.5);
  const pbl = Math.max(100, pblHeightMeters);
  const vi = Math.round(speed * pbl);

  let category = 'Moderate';
  let color = '#FFD600';
  let description = 'Atmospheric dispersion is moderate. Pollutants gradually clear with ambient breeze.';

  if (vi < 6000) {
    category = 'Stagnant (Trapping Alert)';
    color = '#FF1744';
    description = 'Dangerous atmospheric trapping. Low boundary layer and weak winds prevent pollutant dispersal.';
  } else if (vi > 12000) {
    category = 'Favorable (Vigorous Dispersion)';
    color = '#00E676';
    description = 'High ventilation velocity. Atmosphere is actively flushing particulate matter and emissions.';
  }

  return { vi, category, color, description, pbl };
}

export function generateMeteorologicalBulletin(stationName, wind, vi) {
  return {
    headline: `${vi.category}: Ventilation Index ${vi.vi} m²/s across ${stationName}`,
    summary: `Boundary-layer winds are blowing at ${wind.speed} m/s from the ${wind.cardinal} (${wind.dir}°). Planetary Boundary Layer is estimated at ${vi.pbl}m. ${vi.description}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

export function computeBackwardTrajectory(targetLat, targetLon, windField, hours = 24) {
  const waypoints = [];
  let currLat = targetLat;
  let currLon = targetLon;
  waypoints.push({ lat: currLat, lon: currLon, hour: 0 });

  const kmPerDegreeLat = 111.0;
  const kmPerDegreeLon = 111.0 * Math.cos((targetLat * Math.PI) / 180);

  for (let h = 1; h <= hours; h++) {
    const wind = interpolateWindVector(currLat, currLon);
    // Backward in time: air packet moved from upwind
    // u (eastward) in m/s -> km/hr * 3.6
    const dLonKm = -(wind.u * 3.6);
    const dLatKm = -(wind.v * 3.6);

    currLat += dLatKm / kmPerDegreeLat;
    currLon += dLonKm / kmPerDegreeLon;

    waypoints.push({
      lat: Math.round(currLat * 10000) / 10000,
      lon: Math.round(currLon * 10000) / 10000,
      hour: -h,
      speed: wind.speed,
      dir: wind.dir
    });
  }

  const originLat = waypoints[waypoints.length - 1].lat;
  const originLon = waypoints[waypoints.length - 1].lon;
  let sector = 'Local Basin';

  if (originLat > targetLat + 1 && originLon < targetLon - 0.5) {
    sector = 'Northwest Agricultural & Desert Corridor (Punjab / Haryana / Thar)';
  } else if (originLon < targetLon - 1) {
    sector = 'Western Marine / Coastal Air Mass';
  } else if (originLon > targetLon + 1) {
    sector = 'Eastern Gangetic / Bay of Bengal Flow';
  }

  return {
    type: 'backward',
    originSector: sector,
    durationHours: hours,
    waypoints
  };
}

export function computeForwardDispersion(targetLat, targetLon, windField, hours = 18) {
  const waypoints = [];
  let currLat = targetLat;
  let currLon = targetLon;
  waypoints.push({ lat: currLat, lon: currLon, hour: 0, sigmaKm: 2.0 });

  const kmPerDegreeLat = 111.0;
  const kmPerDegreeLon = 111.0 * Math.cos((targetLat * Math.PI) / 180);

  for (let h = 1; h <= hours; h++) {
    const wind = interpolateWindVector(currLat, currLon);
    const dLonKm = wind.u * 3.6;
    const dLatKm = wind.v * 3.6;

    currLat += dLatKm / kmPerDegreeLat;
    currLon += dLonKm / kmPerDegreeLon;

    // Taylor turbulent diffusion: sigma increases with square root of time
    const sigmaKm = Math.round((2.0 + Math.sqrt(h) * 4.5) * 10) / 10;

    waypoints.push({
      lat: Math.round(currLat * 10000) / 10000,
      lon: Math.round(currLon * 10000) / 10000,
      hour: h,
      sigmaKm,
      speed: wind.speed
    });
  }

  return {
    type: 'forward',
    durationHours: hours,
    waypoints
  };
}
