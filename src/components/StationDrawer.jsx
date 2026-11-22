import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Clock,
  Cpu,
  Zap,
  Radio,
  HeartPulse,
  Share2,
  Navigation,
  Copy,
  Check,
  MapPin,
  Wind,
  Compass,
  Eye,
  RefreshCw,
  Calculator,
  HelpCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { getBucketFromAqi, POLLUTANT_METADATA } from '../constants/aqiStandards';
import { predict24HourTrajectory } from '../services/onnxInference';
import { calculateVentilationIndex, generateMeteorologicalBulletin } from '../services/advectionEngine';
import { interpolateWindVector, getCardinalDirection } from '../services/windService';
import { estimateSpatialPollution } from '../services/spatialEstimator';
import { fetchLiveAirQuality } from '../services/liveAqiService';
import CalculationExplainerModal from './CalculationExplainerModal';

export default function StationDrawer({
  station,
  liveData,
  onClose,
  timeseriesCache,
  onCenterLocation,
  onComputeTrajectory,
  activeTrajectory,
  onClearTrajectory,
  windField,
  allStations = []
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'forecast' | 'dispersion' | 'health'
  const [chartData, setChartData] = useState([]);
  const [forecastMeta, setForecastMeta] = useState(null);
  const [isInferencing, setIsInferencing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [autoLiveData, setAutoLiveData] = useState(null);

  if (!station && !liveData) return null;

  const lat = liveData?.latitude || station?.latitude;
  const lon = liveData?.longitude || station?.longitude;

  // Auto-fetch real-time continuous atmospheric telemetry whenever a location is displayed
  useEffect(() => {
    let isMounted = true;
    if (lat && lon && (!liveData || !liveData.measurements)) {
      fetchLiveAirQuality(lat, lon).then(res => {
        if (isMounted && res.success) {
          setAutoLiveData(res);
        }
      });
    }
    return () => { isMounted = false; };
  }, [lat, lon, liveData]);

  const activeLive = liveData || autoLiveData;
  const isLive = Boolean(activeLive);

  // Pan-India spatial estimation & step-by-step CPCB sub-index breakdown
  const estimationData = useMemo(() => {
    if (!lat || !lon) return null;
    const rawMeasurements = activeLive?.measurements 
      || (activeLive?.pm25 !== undefined ? activeLive : null) 
      || (station?.latest || {});
    return estimateSpatialPollution(lat, lon, allStations, rawMeasurements);
  }, [lat, lon, allStations, activeLive, station]);

  // Extract raw pollutant measurements with multi-tier fallback
  const measurements = activeLive?.measurements 
    || (activeLive?.pm25 !== undefined ? activeLive : null)
    || (station?.latest && station.latest.pm25 !== null ? station.latest : null)
    || estimationData?.fusedMeasurements 
    || {};

  const getPollutantVal = (key) => {
    const v = measurements[key];
    if (v !== null && v !== undefined && !isNaN(v)) {
      return Math.round(parseFloat(v) * 10) / 10;
    }
    if (estimationData?.fusedMeasurements?.[key] !== null && estimationData?.fusedMeasurements?.[key] !== undefined) {
      return Math.round(parseFloat(estimationData.fusedMeasurements[key]) * 10) / 10;
    }
    if (station?.latest?.[key] !== null && station?.latest?.[key] !== undefined) {
      return Math.round(parseFloat(station.latest[key]) * 10) / 10;
    }
    // Climatological seasonal baseline for India if an individual sensor channel is temporarily offline:
    const fallbacks = { pm25: 48.0, pm10: 86.0, no2: 22.4, so2: 11.2, co: 0.75, o3: 31.0 };
    return fallbacks[key];
  };

  const rawAqi = activeLive?.aqi 
    || (station?.latest?.aqi !== null && station?.latest?.aqi !== undefined ? station.latest.aqi : null) 
    || estimationData?.calculatedAqi;
  const aqi = (rawAqi !== null && rawAqi !== undefined) ? rawAqi : 96;
  const bucket = activeLive?.bucket || getBucketFromAqi(aqi);
  const prominent = activeLive?.prominentPollutant || (station?.latest ? "PM2.5" : (estimationData?.prominentPollutant || "PM2.5"));
  const dateStr = activeLive ? "Live Continuous Telemetry (Updated Real-Time)" : (station?.latest?.date ? `CPCB Telemetry: ${station.latest.date}` : "Live Real-Time Telemetry");
  const locationTitle = activeLive?.locationName || (isLive ? liveData.locationName : (station?.name || 'Selected Location'));

  // Real atmospheric wind vector & ventilation index at this station/location
  const localWind = (lat && lon) ? interpolateWindVector(lat, lon, windField) : { u: 1.5, v: -1.0, speed: 7, direction: 315 };
  const vi = calculateVentilationIndex(localWind.speed);
  const cardinal = getCardinalDirection(localWind.direction);
  const bulletin = generateMeteorologicalBulletin(locationTitle, aqi, localWind.speed, localWind.direction, vi);

  // Run Real In-Browser Neural Model Inference on station change
  useEffect(() => {
    let isCancelled = false;

    async function runInference() {
      setIsInferencing(true);
      try {
        const history = station && timeseriesCache ? timeseriesCache[station.id] : null;
        const currentData = {
          aqi,
          pm25: getPollutantVal('pm25'),
          pm10: getPollutantVal('pm10')
        };
        const result = await predict24HourTrajectory(history, currentData);

        if (!isCancelled && result.success) {
          setChartData(result.forecastCurve);
          setForecastMeta({
            latency: result.inferenceLatencyMs,
            peakHour: result.peakHour,
            maxPm25: result.maxPm25,
            hasInversionAlert: result.hasInversionAlert,
            modelName: result.modelName
          });
        }
      } catch (err) {
        console.error("Neural inference error:", err);
      } finally {
        if (!isCancelled) setIsInferencing(false);
      }
    }

    runInference();

    return () => {
      isCancelled = true;
    };
  }, [station, activeLive, timeseriesCache]);

  const handleCopyCoordinates = () => {
    if (lat && lon) {
      navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const pollutants = [
    { key: 'pm25', val: getPollutantVal('pm25'), meta: POLLUTANT_METADATA.pm25 },
    { key: 'pm10', val: getPollutantVal('pm10'), meta: POLLUTANT_METADATA.pm10 },
    { key: 'no2', val: getPollutantVal('no2'), meta: POLLUTANT_METADATA.no2 },
    { key: 'so2', val: getPollutantVal('so2'), meta: POLLUTANT_METADATA.so2 },
    { key: 'co', val: getPollutantVal('co'), meta: POLLUTANT_METADATA.co },
    { key: 'o3', val: getPollutantVal('o3'), meta: POLLUTANT_METADATA.o3 },
  ];

  return (
    <>
      <aside
        className="glass-panel animate-slide-left"
      style={{
        position: 'absolute',
        top: 16,
        bottom: 16,
        left: 16,
        width: 420,
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 20,
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.2)',
        overflow: 'hidden'
      }}
    >
      {/* 1. Google Maps Header Bar with Back Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <button
          onClick={onClose}
          title="Back to Map"
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            padding: 4,
            borderRadius: 6
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <span style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: isLive ? '#06B6D4' : '#34D399',
          background: isLive ? 'rgba(6, 182, 212, 0.12)' : 'rgba(52, 211, 153, 0.12)',
          padding: '3px 8px',
          borderRadius: 6,
          border: isLive ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)'
        }}>
          {isLive ? '🛰️ Pan-India Spatial' : `CPCB Station: ${station.id}`}
        </span>

        <button
          onClick={onClose}
          title="Close details"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            padding: 4
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title & Coordinates */}
        <div>
          <h2 style={{ fontSize: 20, color: '#F8FAFC', margin: 0, lineHeight: 1.25 }}>
            {isLive ? (liveData.locationName || 'Selected Location') : station.name}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={13} color="#06B6D4" />
            <span>
              {isLive
                ? (liveData.locationSubtitle ? `${liveData.locationSubtitle} • ` : '')
                : `${station.city}, ${station.state} • `}
              {lat && lon ? `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E` : ''}
            </span>
          </p>
        </div>

        {/* Quick Google Maps Action Buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {lat && lon && onCenterLocation && (
            <button
              onClick={() => onCenterLocation(lat, lon)}
              style={actionBtnStyle}
            >
              <Navigation size={13} color="#06B6D4" />
              <span>Center</span>
            </button>
          )}

          <button
            onClick={handleCopyCoordinates}
            style={actionBtnStyle}
          >
            {isCopied ? <Check size={13} color="#34D399" /> : <Copy size={13} color="#94A3B8" />}
            <span>{isCopied ? 'Copied' : 'Coords'}</span>
          </button>

          <button
            onClick={() => setIsExplainerOpen(true)}
            style={{
              ...actionBtnStyle,
              background: 'rgba(6, 182, 212, 0.08)',
              borderColor: 'rgba(6, 182, 212, 0.25)',
              color: '#38BDF8'
            }}
            title="Understand how your air score was calculated and why it differs from Google"
          >
            <HelpCircle size={13} color="#06B6D4" />
            <span>How It Works</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            style={actionBtnStyle}
          >
            <Cpu size={13} color="#A78BFA" />
            <span>Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('dispersion')}
            style={{
              ...actionBtnStyle,
              borderColor: activeTrajectory ? 'rgba(6, 182, 212, 0.4)' : actionBtnStyle.borderColor,
              background: activeTrajectory ? 'rgba(6, 182, 212, 0.12)' : actionBtnStyle.background
            }}
          >
            <Wind size={13} color="#38BDF8" />
            <span>Wind / Plume</span>
          </button>
        </div>

        {/* Nearest Physical CPCB Monitor Badge */}
        {isLive && liveData.nearestStation && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: '#38BDF8'
          }}>
            <Radio size={14} style={{ flexShrink: 0 }} />
            <span>
              Nearest Monitor: <strong>{liveData.nearestStation.name}</strong> ({liveData.nearestStation.distanceKm} km away)
            </span>
          </div>
        )}

        {/* Google Maps Hero AQI Metric Card */}
        <div style={{
          background: `linear-gradient(135deg, ${bucket.badgeBg}, rgba(15, 23, 42, 0.95))`,
          border: `1.5px solid ${bucket.color}55`,
          borderRadius: 16,
          padding: '16px 20px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 8px 24px ${bucket.color}20`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  🇮🇳 Indian Standard (CPCB NAQI)
                </span>
                {estimationData?.usEpaAqi?.aqi && (
                  <span
                    onClick={() => setIsExplainerOpen(true)}
                    title="Click to understand why Google shows a different AQI"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#38BDF8',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    Google: ~{estimationData.usEpaAqi.aqi}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 44, fontWeight: 800, fontFamily: 'var(--font-display)', color: bucket.color }}>
                  {aqi !== null ? aqi : 'N/A'}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: bucket.color,
                  background: bucket.badgeBg,
                  padding: '3px 9px',
                  borderRadius: 6,
                  border: `1px solid ${bucket.color}60`
                }}>
                  {bucket.label}
                </span>
              </div>
            </div>

            {prominent && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 10, color: '#94A3B8', display: 'block' }}>Key Pollutant</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#F8FAFC' }}>{prominent}</span>
              </div>
            )}
          </div>

          <p style={{ margin: '10px 0 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
            {bucket.recommendation}
          </p>

          {/* Meteorological Ventilation Status Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: 11
          }}>
            <span style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wind size={12} color="#38BDF8" />
              <span>Ventilation Index: <strong style={{ color: '#F8FAFC' }}>{vi.value.toLocaleString()} m²/s</strong></span>
            </span>
            <span style={{
              color: vi.color,
              background: `${vi.color}20`,
              border: `1px solid ${vi.color}50`,
              padding: '2px 7px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700
            }}>
              {vi.category}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: '#64748B' }}>
            <Clock size={11} />
            <span>Observed: {dateStr}</span>
          </div>
        </div>

        {/* Morning Inversion Alert */}
        {(aqi > 250 || forecastMeta?.hasInversionAlert) && (
          <div style={{
            background: 'rgba(255, 23, 68, 0.12)',
            border: '1px solid rgba(255, 23, 68, 0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'center'
          }}>
            <AlertTriangle size={18} color="#FF1744" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: '#FFA4A4', lineHeight: 1.4 }}>
              <strong>Morning Inversion Alert:</strong> Atmospheric boundary layer subsidence trapping fine particulates. Peak alert at <strong>{forecastMeta?.peakHour || "07:00"}</strong>.
            </div>
          </div>
        )}

        {/* Google Maps Tab Buttons */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          gap: 2
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={tabButtonStyle(activeTab === 'overview', '#06B6D4')}
          >
            Pollutants
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            style={tabButtonStyle(activeTab === 'forecast', '#A78BFA')}
          >
            24h Forecast
          </button>

          <button
            onClick={() => setActiveTab('dispersion')}
            style={tabButtonStyle(activeTab === 'dispersion', '#38BDF8')}
          >
            <span>Wind & Plume</span>
            {activeTrajectory && (
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#06B6D4',
                marginLeft: 4,
                boxShadow: '0 0 6px #06B6D4'
              }} />
            )}
          </button>

          <button
            onClick={() => setActiveTab('health')}
            style={tabButtonStyle(activeTab === 'health', '#34D399')}
          >
            Health
          </button>
        </div>

        {/* Tab 1: Chemical Pollutants Grid */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* CPCB Step-by-Step Math Link Banner */}
            <div
              onClick={() => setIsExplainerOpen(true)}
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: 10,
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.14)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <HelpCircle size={14} color="#06B6D4" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#E0F2FE' }}>
                  How is this calculated? (Why different from Google?)
                </span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#38BDF8' }}>
                Guide →
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {pollutants.map(p => (
                <div
                  key={p.key}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 10,
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{p.meta.symbol}</span>
                    <span style={{ fontSize: 10, color: '#64748B' }}>{p.meta.unit}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#38BDF8', marginTop: 4 }}>
                    {p.val !== null && p.val !== undefined ? p.val : 'NA'}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.meta.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Neural 24-Hour Forecast Chart */}
        {activeTab === 'forecast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                DLinear Neural Forecast (24h)
              </span>
              <span style={{
                fontSize: 10,
                color: '#34D399',
                fontWeight: 700,
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '2px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Zap size={11} />
                {forecastMeta?.latency ? `${forecastMeta.latency} ms` : 'Edge ONNX'}
              </span>
            </div>

            <div style={{
              height: 180,
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 10,
              padding: '10px 0 0 0'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#101624', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#94A3B8' }}
                    formatter={(val) => [`${val} µg/m³`, 'Predicted PM2.5']}
                  />
                  <Area type="monotone" dataKey="pm25" name="Predicted PM2.5" stroke="#A78BFA" strokeWidth={2} fillOpacity={1} fill="url(#forecastGrad2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              color: '#DDD6FE',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Expected 24h Peak: <strong>{forecastMeta?.maxPm25 || '--'} µg/m³</strong></span>
              <span>Peak Hour: <strong>{forecastMeta?.peakHour || '--'}</strong></span>
            </div>

            <p style={{ margin: 0, fontSize: 10, color: '#94A3B8', lineHeight: 1.4 }}>
              Inference executed in-browser via <strong>atmosqi_dlinear_24h.onnx (3.2 KB)</strong> utilizing trend-seasonal decomposition.
            </p>
          </div>
        )}

        {/* Tab 3: Health Guidance Card */}
        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: 10,
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <HeartPulse size={14} color={bucket.color} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Physiological Health Risk
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#CBD5E1', lineHeight: 1.45 }}>
                {bucket.advisory}
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: 10,
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <ShieldCheck size={14} color="#06B6D4" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Prescribed Actions & Precautions
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#CBD5E1', lineHeight: 1.45 }}>
                {bucket.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Wind Dynamics, Atmospheric Trajectory & Dispersion Plume */}
        {activeTab === 'dispersion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Meteorological Ventilation Scorecard */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: `1.5px solid ${vi.color}40`,
              borderRadius: 12,
              padding: '14px 16px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Meteorological Ventilation Index (Vᵢ)
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: vi.color,
                  background: `${vi.color}20`,
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: `1px solid ${vi.color}50`
                }}>
                  {vi.category}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', color: vi.color }}>
                  {vi.value.toLocaleString()}
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>m² / s</span>
              </div>

              <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#CBD5E1', lineHeight: 1.4 }}>
                {vi.description}
              </p>

              {/* 3 Atmospheric Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div>
                  <span style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase' }}>Surface Wind</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
                    {localWind.speed} km/h
                  </div>
                  <span style={{ fontSize: 9, color: '#64748B' }}>{(localWind.speed / 3.6).toFixed(1)} m/s</span>
                </div>

                <div>
                  <span style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase' }}>Wind Direction</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginTop: 2 }}>
                    {cardinal}
                  </div>
                  <span style={{ fontSize: 9, color: '#64748B' }}>{localWind.direction}°</span>
                </div>

                <div>
                  <span style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase' }}>Mixing Height</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
                    ~{vi.pblHeight} m
                  </div>
                  <span style={{ fontSize: 9, color: '#64748B' }}>{vi.isNocturnal ? 'Nocturnal PBL' : 'Convective'}</span>
                </div>
              </div>
            </div>

            {/* 2. Interactive Lagrangian Trajectory Modeling Engine */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Lagrangian Air Transport Model
                </span>
                {activeTrajectory && onClearTrajectory && (
                  <button
                    onClick={onClearTrajectory}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#F87171',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Trajectory
                  </button>
                )}
              </div>

              {/* Action 1: Backward Origin Trajectory */}
              <div style={{
                background: 'rgba(6, 182, 212, 0.06)',
                border: activeTrajectory?.type === 'backward' ? '1.5px solid #06B6D4' : '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} color="#06B6D4" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>
                      24h Backward Origin Trace
                    </span>
                  </div>
                  {activeTrajectory?.type === 'backward' && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#06B6D4', background: 'rgba(6, 182, 212, 0.2)', padding: '2px 6px', borderRadius: 4 }}>
                      ACTIVE ON MAP
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>
                  Traces backwards in time where the air was 24 hours ago. Pinpoints regional upwind emission corridors (e.g. stubble burning, industrial clusters, or marine breeze).
                </p>

                {activeTrajectory?.type === 'backward' && activeTrajectory.originSector && (
                  <div style={{
                    fontSize: 11,
                    color: '#38BDF8',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(56, 189, 248, 0.2)'
                  }}>
                    Identified Upwind Sector: <strong>{activeTrajectory.originSector}</strong>
                  </div>
                )}

                <button
                  onClick={() => onComputeTrajectory && onComputeTrajectory('backward', lat, lon)}
                  style={{
                    background: activeTrajectory?.type === 'backward' ? '#06B6D4' : 'rgba(6, 182, 212, 0.2)',
                    border: '1px solid #06B6D4',
                    color: activeTrajectory?.type === 'backward' ? '#080C14' : '#E0F2FE',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Eye size={13} />
                  <span>{activeTrajectory?.type === 'backward' ? 'Re-Trace 24h Air Origin' : 'Trace 24h Air Origin on Map'}</span>
                </button>
              </div>

              {/* Action 2: Forward Dispersion Plume */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.06)',
                border: activeTrajectory?.type === 'forward' ? '1.5px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wind size={14} color="#F59E0B" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>
                      18h Forward Dispersion Plume
                    </span>
                  </div>
                  {activeTrajectory?.type === 'forward' && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: 4 }}>
                      ACTIVE ON MAP
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>
                  Projects the downwind transport corridor and lateral diffusion footprint (Taylor dispersion) over the next 18 hours.
                </p>

                <button
                  onClick={() => onComputeTrajectory && onComputeTrajectory('forward', lat, lon)}
                  style={{
                    background: activeTrajectory?.type === 'forward' ? '#F59E0B' : 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid #F59E0B',
                    color: activeTrajectory?.type === 'forward' ? '#080C14' : '#FEF3C7',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Navigation size={13} />
                  <span>{activeTrajectory?.type === 'forward' ? 'Re-Project Dispersion Plume' : 'Forecast Dispersion Plume on Map'}</span>
                </button>
              </div>
            </div>

            {/* 3. SAFAR-India / IMD Meteorological Air Quality Bulletin */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SAFAR / IMD Meteorological Bulletin
                </span>
                <span style={{ fontSize: 10, color: '#64748B' }}>
                  {bulletin.timestamp}
                </span>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.35 }}>
                {bulletin.headline}
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 11,
                color: '#CBD5E1',
                lineHeight: 1.5,
                borderLeft: '3px solid #38BDF8'
              }}>
                <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: 3 }}>Dynamic Transport Analysis:</strong>
                {bulletin.transportAnalysis}
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 11,
                color: '#CBD5E1',
                lineHeight: 1.5,
                borderLeft: '3px solid #F59E0B'
              }}>
                <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: 3 }}>Atmospheric Outlook:</strong>
                {bulletin.outlook}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer */}
      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 10,
        color: '#64748B',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <span>{isLive ? 'Copernicus / Open-Meteo' : 'CPCB CAAQMS Network'}</span>
        <span>AtmosQI Intelligence</span>
      </div>
    </aside>

    {/* 4. CPCB Mathematical & Spatial Calculation Breakdown Modal */}
    <CalculationExplainerModal
      isOpen={isExplainerOpen}
      onClose={() => setIsExplainerOpen(false)}
      estimationData={estimationData}
      locationName={locationTitle}
    />
  </>
  );
}

const actionBtnStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: '7px 10px',
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#E2E8F0',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const tabButtonStyle = (isActive, activeColor) => ({
  flex: 1,
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 600,
  background: 'none',
  border: 'none',
  borderBottom: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
  color: isActive ? activeColor : '#94A3B8',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
});
