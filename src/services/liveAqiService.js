/**
 * AtmosQI — Real-Time Ambient Air Quality API Service
 * Queries Open-Meteo European CAMS / Copernicus Atmospheric Reanalysis & Forecast.
 * Free, open, zero API key required, covers 100% of India's geographic grid.
 */

import { computeCompositeAQI } from './aqiEngine.js';

export async function fetchLiveAirQuality(latitude, longitude) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5,pm10&forecast_days=2`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Air Quality API error: ${response.statusText}`);
    }

    const data = await response.json();
    const current = data.current || {};

    // Map units:
    // Open-Meteo: carbon_monoxide is in ug/m3, CPCB CO is in mg/m3 (divide by 1000)
    const measurements = {
      pm25: current.pm2_5 !== undefined ? Math.round(current.pm2_5 * 10) / 10 : null,
      pm10: current.pm10 !== undefined ? Math.round(current.pm10 * 10) / 10 : null,
      no2: current.nitrogen_dioxide !== undefined ? Math.round(current.nitrogen_dioxide * 10) / 10 : null,
      so2: current.sulphur_dioxide !== undefined ? Math.round(current.sulphur_dioxide * 10) / 10 : null,
      co: current.carbon_monoxide !== undefined ? Math.round((current.carbon_monoxide / 1000) * 100) / 100 : null,
      o3: current.ozone !== undefined ? Math.round(current.ozone * 10) / 10 : null
    };

    const cpcbResult = computeCompositeAQI(measurements);

    // Extract next 24-hr forecast curve if available
    const hourlyTimes = data.hourly?.time || [];
    const hourlyPm25 = data.hourly?.pm2_5 || [];
    const forecastCurve = [];

    const nowIso = new Date().toISOString().slice(0, 13);
    let startIdx = hourlyTimes.findIndex(t => t.startsWith(nowIso));
    if (startIdx === -1) startIdx = 0;

    for (let i = startIdx; i < Math.min(startIdx + 24, hourlyTimes.length); i++) {
      forecastCurve.push({
        time: hourlyTimes[i].slice(11, 16), // "HH:MM"
        pm25: Math.round(hourlyPm25[i]),
        aqi: Math.round(hourlyPm25[i] * 1.8) // Approximate CPCB sub-index
      });
    }

    return {
      success: true,
      latitude,
      longitude,
      measurements,
      aqi: cpcbResult.aqi,
      bucket: cpcbResult.bucket,
      prominentPollutant: cpcbResult.prominentPollutant,
      subIndices: cpcbResult.subIndices,
      forecastCurve,
      timestamp: current.time || new Date().toISOString(),
      provider: "Copernicus Atmospheric / Open-Meteo (Real-Time)"
    };
  } catch (error) {
    console.error("Failed to fetch live air quality:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
