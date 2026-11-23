/**
 * AtmosQI — Lagrangian Trajectory & Advection Engine
 * Models backward provenance trace, forward dispersion plumes, and ventilation index.
 */

import { interpolateWindVector, getCardinalDirection } from './windService.js';

export function calculateVentilationIndex(windSpeedMs, pblHeightMeters = 850) {
  // Ventilation Index (VI) = Wind Speed (m/s) * Planetary Boundary Layer Height (m)
  const speed = Math.max(0.5, parseFloat(windSpeedMs) || 2.5);
  const pbl = Math.max(100, parseFloat(pblHeightMeters) || 850);
  const vi = Math.round(speed * pbl);

  let category = 'Moderate';
  let color = '#EAB308';
  let description = 'Atmospheric dispersion is moderate. Pollutants gradually clear with ambient breeze.';

  if (vi < 6000) {
    category = 'Stagnant (Trapping Alert)';
    color = '#F97316';
    description = 'Dangerous atmospheric trapping. Low boundary layer and weak winds prevent pollutant dispersal.';
  } else if (vi > 12000) {
    category = 'Favorable (Vigorous Dispersion)';
    color = '#10B981';
    description = 'High ventilation velocity. Atmosphere is actively flushing particulate matter and emissions.';
  }

  const currentHour = new Date().getHours();
  const isNocturnal = currentHour < 7 || currentHour > 19;

  return {
    vi,
    value: vi,
    pbl,
    pblHeight: pbl,
    isNocturnal,
    category,
    color,
    description
  };
}

export function generateMeteorologicalBulletin(...args) {
  let stationName = 'Target Area';
  let windSpeed = 3.5;
  let windDir = 315;
  let vi = { value: 6800, vi: 6800, category: 'Moderate', color: '#EAB308', pbl: 850, pblHeight: 850 };

  if (args.length >= 5) {
    // (locationTitle, aqi, localWind.speed, localWind.direction, vi)
    stationName = args[0] || 'Target Area';
    windSpeed = args[2] || 3.5;
    windDir = args[3] || 315;
    vi = args[4] || vi;
  } else if (args.length === 3) {
    // (stationName, wind, vi)
    stationName = args[0] || 'Target Area';
    const wind = args[1] || {};
    windSpeed = wind.speed || 3.5;
    windDir = wind.dir || wind.direction || 315;
    vi = args[2] || vi;
  }

  const cardinal = getCardinalDirection(windDir);
  const viVal = vi.value || vi.vi || 6800;
  const viCat = vi.category || 'Moderate';

  return {
    headline: `${viCat}: Ventilation Index ${viVal.toLocaleString()} m²/s across ${stationName}`,
    summary: `Boundary-layer winds are blowing at ${windSpeed} m/s from the ${cardinal} (${windDir}°). Planetary Boundary Layer is estimated at ${vi.pbl || 850}m.`,
    transportAnalysis: `Current atmospheric transport vectors indicate active regional advection from the ${cardinal} sector (${windDir}°), with boundary layer mixing height near ${vi.pbl || 850} meters.`,
    outlook: `Pollutant dispersal capacity is categorized as ${viCat}. Stagnation risk is mitigated by persistent surface velocity of ${windSpeed} m/s.`,
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
