/**
 * AtmosQI — CPCB NAQI Calculation Engine
 * Implements official linear piecewise sub-index calculation and maximum sub-index logic.
 */

import { CPCB_BREAKPOINTS, getBucketFromAqi } from '../constants/aqiStandards.js';

export function calculateSubIndex(concentration, pollutantKey) {
  if (concentration === null || concentration === undefined || isNaN(concentration)) {
    return null;
  }
  const numericVal = parseFloat(concentration);
  if (numericVal < 0) return null;

  const brackets = CPCB_BREAKPOINTS[pollutantKey.toLowerCase()];
  if (!brackets) return null;

  for (const [Blo, Bhi, Ilo, Ihi] of brackets) {
    if (numericVal >= Blo && numericVal <= Bhi) {
      return Math.round(((Ihi - Ilo) / (Bhi - Blo)) * (numericVal - Blo) + Ilo);
    }
  }

  // Cap at maximum scale (500) if exceeding standard brackets
  return numericVal > 0 ? 500 : 0;
}

export function computeCompositeAQI(measurements) {
  // measurements: { pm25, pm10, no2, so2, co, o3, nh3 }
  const subIndices = {};
  let maxSubIndex = 0;
  let prominentPollutant = null;

  for (const [key, val] of Object.entries(measurements)) {
    const sub = calculateSubIndex(val, key);
    if (sub !== null) {
      subIndices[key] = sub;
      if (sub > maxSubIndex) {
        maxSubIndex = sub;
        prominentPollutant = key.toUpperCase();
      }
    }
  }

  // CPCB Requirement: At least 3 pollutants must be present, and one must be PM2.5 or PM10
  const hasParticulate = subIndices.pm25 !== undefined || subIndices.pm10 !== undefined;
  const count = Object.keys(subIndices).length;

  if (count === 0 || !hasParticulate) {
    return {
      aqi: null,
      bucket: getBucketFromAqi(null),
      prominentPollutant: null,
      subIndices,
      isValid: false,
      reason: "Missing particulate measurement (PM2.5 / PM10)"
    };
  }

  const bucket = getBucketFromAqi(maxSubIndex);

  return {
    aqi: maxSubIndex,
    bucket,
    prominentPollutant,
    subIndices,
    isValid: true
  };
}

/**
 * Calculates Global US-EPA Air Quality Index (Used by Google Search / Apple Weather)
 * This allows users to understand the exact difference between Indian CPCB NAQI and Google's score.
 */
export function calculateUsEpaAqi(pm25Val) {
  if (pm25Val === null || pm25Val === undefined || isNaN(pm25Val)) return null;
  const c = Math.max(0, parseFloat(pm25Val));

  const brackets = [
    [0.0, 12.0, 0, 50, 'Good', '#00E676'],
    [12.1, 35.4, 51, 100, 'Moderate', '#FFD600'],
    [35.5, 55.4, 101, 150, 'Unhealthy for Sensitive', '#FF9100'],
    [55.5, 150.4, 151, 200, 'Unhealthy', '#FF1744'],
    [150.5, 250.4, 201, 300, 'Very Unhealthy', '#9C27B0'],
    [250.5, 500.4, 301, 500, 'Hazardous', '#7E0023']
  ];

  for (const [Blo, Bhi, Ilo, Ihi, label, color] of brackets) {
    if (c >= Blo && c <= Bhi) {
      const aqi = Math.round(((Ihi - Ilo) / (Bhi - Blo)) * (c - Blo) + Ilo);
      return { aqi, label, color };
    }
  }

  return { aqi: 500, label: 'Hazardous', color: '#7E0023' };
}

