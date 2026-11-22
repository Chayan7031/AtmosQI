/**
 * AtmosQI — Indian National Air Quality Index (NAQI) Standards
 * Reference: Central Pollution Control Board (CPCB), Ministry of Environment, Forest & Climate Change
 */

export const AQI_BUCKETS = {
  GOOD: {
    label: "Good",
    min: 0,
    max: 50,
    color: "#00E676",
    glowColor: "rgba(0, 230, 118, 0.4)",
    badgeBg: "rgba(0, 230, 118, 0.15)",
    textColor: "#00E676",
    advisory: "Air quality is considered satisfactory, and air pollution poses little or no risk.",
    recommendation: "Ideal outdoor conditions for all demographics."
  },
  SATISFACTORY: {
    label: "Satisfactory",
    min: 51,
    max: 100,
    color: "#AEEA00",
    glowColor: "rgba(174, 234, 0, 0.4)",
    badgeBg: "rgba(174, 234, 0, 0.15)",
    textColor: "#AEEA00",
    advisory: "Minor breathing discomfort to sensitive individuals.",
    recommendation: "Unusually sensitive people should consider reducing prolonged outdoor exertion."
  },
  MODERATE: {
    label: "Moderate",
    min: 101,
    max: 200,
    color: "#FFD600",
    glowColor: "rgba(255, 214, 0, 0.4)",
    badgeBg: "rgba(255, 214, 0, 0.15)",
    textColor: "#FFD600",
    advisory: "Breathing discomfort to people with lungs, asthma, and heart diseases.",
    recommendation: "Children and elderly should take more breaks during outdoor activities."
  },
  POOR: {
    label: "Poor",
    min: 201,
    max: 300,
    color: "#FF9100",
    glowColor: "rgba(255, 145, 0, 0.4)",
    badgeBg: "rgba(255, 145, 0, 0.15)",
    textColor: "#FF9100",
    advisory: "Breathing discomfort to most people on prolonged exposure.",
    recommendation: "Wear an N95 mask outdoors; limit morning and late evening physical workouts."
  },
  VERY_POOR: {
    label: "Very Poor",
    min: 301,
    max: 400,
    color: "#FF1744",
    glowColor: "rgba(255, 23, 68, 0.4)",
    badgeBg: "rgba(255, 23, 68, 0.15)",
    textColor: "#FF1744",
    advisory: "Respiratory illness on prolonged exposure. Significant impact on healthy individuals.",
    recommendation: "Avoid outdoor exertion. Keep windows closed and operate HEPA purifiers indoors."
  },
  SEVERE: {
    label: "Severe",
    min: 401,
    max: 500,
    color: "#9C27B0",
    glowColor: "rgba(156, 39, 176, 0.5)",
    badgeBg: "rgba(156, 39, 176, 0.2)",
    textColor: "#E1BEE7",
    advisory: "Affects healthy people and seriously impacts those with existing medical conditions.",
    recommendation: "Emergency level. Avoid all outdoor activities; wear respiratory protection if stepping out."
  },
  UNKNOWN: {
    label: "Unknown",
    min: -1,
    max: -1,
    color: "#78909C",
    glowColor: "rgba(120, 144, 156, 0.3)",
    badgeBg: "rgba(120, 144, 156, 0.15)",
    textColor: "#B0BEC5",
    advisory: "Insufficient sensor data to compute AQI.",
    recommendation: "Check neighboring monitoring stations."
  }
};

export const CPCB_BREAKPOINTS = {
  pm25: [
    [0, 30, 0, 50],
    [31, 60, 51, 100],
    [61, 90, 101, 200],
    [91, 120, 201, 300],
    [121, 250, 301, 400],
    [251, 1000, 401, 500]
  ],
  pm10: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 250, 101, 200],
    [251, 350, 201, 300],
    [351, 430, 301, 400],
    [431, 1500, 401, 500]
  ],
  no2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 180, 101, 200],
    [181, 280, 201, 300],
    [281, 400, 301, 400],
    [401, 1000, 401, 500]
  ],
  so2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 380, 101, 200],
    [381, 800, 201, 300],
    [801, 1600, 301, 400],
    [1601, 3000, 401, 500]
  ],
  co: [
    [0, 1.0, 0, 50],
    [1.1, 2.0, 51, 100],
    [2.1, 10.0, 101, 200],
    [10.1, 17.0, 201, 300],
    [17.1, 34.0, 301, 400],
    [34.1, 100.0, 401, 500]
  ],
  o3: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 168, 101, 200],
    [169, 208, 201, 300],
    [209, 748, 301, 400],
    [749, 1500, 401, 500]
  ],
  nh3: [
    [0, 200, 0, 50],
    [201, 400, 51, 100],
    [401, 800, 101, 200],
    [801, 1200, 201, 300],
    [1201, 1800, 301, 400],
    [1801, 3000, 401, 500]
  ]
};

export const POLLUTANT_METADATA = {
  pm25: {
    symbol: "PM2.5",
    name: "Fine Particulate Matter",
    unit: "µg/m³",
    source: "Combustion, vehicles, power plants, crop burning",
    healthImpact: "Penetrates deep into lung alveoli and bloodstream"
  },
  pm10: {
    symbol: "PM10",
    name: "Inhalable Coarse Particles",
    unit: "µg/m³",
    source: "Dust storms, construction, road traffic, agriculture",
    healthImpact: "Irritates eyes, throat, and upper respiratory tract"
  },
  no2: {
    symbol: "NO₂",
    name: "Nitrogen Dioxide",
    unit: "µg/m³",
    source: "Vehicular exhaust, fossil fuel burning",
    healthImpact: "Inflames airways, increases asthma severity"
  },
  so2: {
    symbol: "SO₂",
    name: "Sulfur Dioxide",
    unit: "µg/m³",
    source: "Thermal power stations, industrial smelting",
    healthImpact: "Forms acid haze, impairs lung function"
  },
  co: {
    symbol: "CO",
    name: "Carbon Monoxide",
    unit: "mg/m³",
    source: "Incomplete vehicular combustion, bio-mass fires",
    healthImpact: "Reduces oxygen-carrying capacity of blood"
  },
  o3: {
    symbol: "O₃",
    name: "Ground-Level Ozone",
    unit: "µg/m³",
    source: "Photochemical reaction of NOx and VOCs under sunlight",
    healthImpact: "Powerful oxidizer; damages lung tissue and crops"
  },
  nh3: {
    symbol: "NH₃",
    name: "Ammonia",
    unit: "µg/m³",
    source: "Agricultural fertilizers, livestock waste",
    healthImpact: "Corrosive to respiratory passages; precursor to PM2.5"
  }
};

export function getBucketFromAqi(aqi) {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return AQI_BUCKETS.UNKNOWN;
  if (aqi <= 50) return AQI_BUCKETS.GOOD;
  if (aqi <= 100) return AQI_BUCKETS.SATISFACTORY;
  if (aqi <= 200) return AQI_BUCKETS.MODERATE;
  if (aqi <= 300) return AQI_BUCKETS.POOR;
  if (aqi <= 400) return AQI_BUCKETS.VERY_POOR;
  return AQI_BUCKETS.SEVERE;
}
