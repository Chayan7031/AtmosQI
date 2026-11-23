/**
 * AtmosQI — Atmospheric Wind Vector & Meteorological Service
 * Models 10m surface wind vectors and atmospheric transport across India.
 */

// Strategic meteorological anchor stations across India (ECMWF / Open-Meteo reanalysis anchors)
export const METEOROLOGICAL_ANCHORS = [
  { name: 'Northern Plains / Delhi', lat: 28.6139, lon: 77.2090, u: -3.2, v: -2.1, speed: 3.8, dir: 305 },
  { name: 'Punjab / Agricultural Corridor', lat: 31.1471, lon: 75.3412, u: -3.8, v: -2.5, speed: 4.5, dir: 310 },
  { name: 'Gangetic Basin / Patna', lat: 25.5941, lon: 85.1376, u: -2.8, v: -1.2, speed: 3.0, dir: 295 },
  { name: 'Eastern Gateway / Kolkata', lat: 22.5726, lon: 88.3639, u: -1.5, v: 2.1, speed: 2.6, dir: 145 },
  { name: 'Western Coast / Mumbai', lat: 19.0760, lon: 72.8777, u: 2.5, v: 3.1, speed: 4.0, dir: 220 },
  { name: 'Central Plateau / Bhopal', lat: 23.2599, lon: 77.4126, u: -1.9, v: -0.8, speed: 2.1, dir: 285 },
  { name: 'Deccan South / Bengaluru', lat: 12.9716, lon: 77.5946, u: 2.8, v: 1.2, speed: 3.1, dir: 245 },
  { name: 'Coromandel / Chennai', lat: 13.0827, lon: 80.2707, u: -1.8, v: 2.4, speed: 3.0, dir: 130 },
  { name: 'Thar Desert / Jodhpur', lat: 26.2389, lon: 73.0243, u: -4.1, v: -1.9, speed: 4.5, dir: 300 },
  { name: 'Himalayan Foothills / Dehradun', lat: 30.3165, lon: 78.0322, u: -2.1, v: -1.8, speed: 2.8, dir: 315 },
  { name: 'Northeast Corridor / Guwahati', lat: 26.1445, lon: 91.7362, u: -1.2, v: 0.8, speed: 1.5, dir: 125 },
  { name: 'Southern Tip / Kanyakumari', lat: 8.0883, lon: 77.5385, u: 3.5, v: 1.5, speed: 3.8, dir: 240 }
];

export function getCardinalDirection(angleDeg) {
  if (angleDeg === null || angleDeg === undefined || isNaN(angleDeg)) return 'NW';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((angleDeg % 360) + 360) % 360 / 22.5) % 16;
  return directions[index] || 'NW';
}

/**
 * Interpolates wind vectors (u, v, speed, dir) for any arbitrary point in India using Inverse Distance Weighting
 */
export function interpolateWindVector(targetLat, targetLon, customAnchors = METEOROLOGICAL_ANCHORS) {
  const anchors = (Array.isArray(customAnchors) && customAnchors.length > 0) ? customAnchors : METEOROLOGICAL_ANCHORS;
  let totalWeight = 0;
  let weightedU = 0;
  let weightedV = 0;

  const lat = (targetLat !== null && targetLat !== undefined && !isNaN(targetLat)) ? parseFloat(targetLat) : 22.8;
  const lon = (targetLon !== null && targetLon !== undefined && !isNaN(targetLon)) ? parseFloat(targetLon) : 80.5;

  for (const anchor of anchors) {
    if (!anchor || typeof anchor.lat !== 'number' || typeof anchor.lon !== 'number') continue;
    const dLat = lat - anchor.lat;
    const dLon = lon - anchor.lon;
    const distSq = dLat * dLat + dLon * dLon;

    if (distSq < 0.0001) {
      return {
        u: anchor.u,
        v: anchor.v,
        speed: anchor.speed,
        dir: anchor.dir,
        direction: anchor.dir,
        cardinal: getCardinalDirection(anchor.dir)
      };
    }

    const weight = 1 / Math.pow(Math.max(0.001, distSq), 1.2);
    totalWeight += weight;
    weightedU += (anchor.u || 0) * weight;
    weightedV += (anchor.v || 0) * weight;
  }

  const u = totalWeight > 0 ? weightedU / totalWeight : 1.5;
  const v = totalWeight > 0 ? weightedV / totalWeight : -1.0;
  const speed = Math.round(Math.sqrt(u * u + v * v) * 10) / 10;
  let dir = Math.round((Math.atan2(-u, -v) * 180) / Math.PI);
  if (dir < 0) dir += 360;

  return {
    u,
    v,
    speed,
    dir,
    direction: dir,
    cardinal: getCardinalDirection(dir)
  };
}
