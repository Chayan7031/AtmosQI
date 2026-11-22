/**
 * AtmosQI — Pan-India Spatial Pollution Estimator
 * Inverse Distance Weighting (IDW) interpolation between continuous CPCB ground monitoring nodes.
 */

import { computeCompositeAQI } from './aqiEngine.js';

export function estimateSpatialPollution(targetLat, targetLon, allStations = [], liveFallback = null) {
  if (!allStations || allStations.length === 0) {
    if (liveFallback) {
      return {
        fusedMeasurements: liveFallback,
        nearestStationDistanceKm: 0,
        confidence: 'Copernicus Atmospheric Model'
      };
    }
    return null;
  }

  // Find nearest k stations
  const scored = allStations
    .filter(s => s.latitude && s.longitude && s.latest && s.latest.pm25 !== null)
    .map(s => {
      const dLat = targetLat - s.latitude;
      const dLon = targetLon - s.longitude;
      // Approximate distance in km
      const distKm = Math.sqrt(dLat * dLat + (dLon * Math.cos(targetLat * Math.PI / 180)) ** 2) * 111.0;
      return { station: s, distKm };
    })
    .sort((a, b) => a.distKm - b.distKm);

  if (scored.length === 0) {
    return {
      fusedMeasurements: liveFallback || {},
      nearestStationDistanceKm: 0,
      confidence: 'Fallback Telemetry'
    };
  }

  const nearest = scored[0];
  const kNearest = scored.slice(0, 4);

  // If extremely close to an existing monitor (< 5 km), use its data directly
  if (nearest.distKm < 5.0) {
    return {
      fusedMeasurements: nearest.station.latest,
      nearestStationDistanceKm: Math.round(nearest.distKm * 10) / 10,
      nearestStationName: nearest.station.name,
      confidence: 'High (Direct Monitor Proximity)'
    };
  }

  // Otherwise perform IDW interpolation across the 4 nearest monitors
  let totalWeight = 0;
  const sums = { pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0, nh3: 0 };
  const counts = { pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0, nh3: 0 };

  for (const { station, distKm } of kNearest) {
    const w = 1.0 / Math.pow(Math.max(1.0, distKm), 2);
    totalWeight += w;
    const latest = station.latest || {};

    for (const key of Object.keys(sums)) {
      if (latest[key] !== null && latest[key] !== undefined && !isNaN(latest[key])) {
        sums[key] += parseFloat(latest[key]) * w;
        counts[key] += w;
      }
    }
  }

  const fused = {};
  for (const key of Object.keys(sums)) {
    if (counts[key] > 0) {
      fused[key] = Math.round((sums[key] / counts[key]) * 10) / 10;
    } else if (liveFallback && liveFallback[key] !== undefined) {
      fused[key] = liveFallback[key];
    }
  }

  const cpcb = computeCompositeAQI(fused);

  return {
    fusedMeasurements: fused,
    interpolatedAqi: cpcb.aqi,
    interpolatedBucket: cpcb.bucket,
    nearestStationDistanceKm: Math.round(nearest.distKm * 10) / 10,
    nearestStationName: nearest.station.name,
    confidence: nearest.distKm < 30 ? 'High (Triangulated)' : nearest.distKm < 80 ? 'Moderate (Regional IDW)' : 'Low (Satellite/Model Dominant)'
  };
}
