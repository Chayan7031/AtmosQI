import React, { useState, memo } from 'react';
import {
  Activity,
  Radio,
  Sliders,
  Compass,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

function TacticalBottomDeck({
  selectedStation,
  liveData,
  selectedBucket,
  onSelectBucket,
  aqiCeiling,
  onAqiCeilingChange,
  windThreshold,
  onWindThresholdChange,
  isWindActive = true,
  onToggleWind
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extract latest measurements for spectrum bars
  const measurements = liveData?.measurements || selectedStation?.latest || {
    pm25: 78,
    pm10: 142,
    no2: 34,
    so2: 12,
    co: 1.2,
    o3: 26,
    nh3: 18
  };

  const currentAqi = liveData?.aqi || selectedStation?.latest?.aqi || 142;
  const currentStationName = liveData?.locationName || selectedStation?.name || 'Pan-India Fleet Aggregate';
  const currentCoordinates = liveData?.latitude && liveData?.longitude 
    ? `${liveData.latitude.toFixed(3)}°N, ${liveData.longitude.toFixed(3)}°E` 
    : '28.613°N, 77.209°E';

  // Spectrum Pollutant List with authentic palette
  const spectrumPollutants = [
    { key: 'pm25', label: 'PM2.5', max: 250, unit: 'µg/m³', val: measurements.pm25 || 0, color: '#f97316' },
    { key: 'pm10', label: 'PM10', max: 400, unit: 'µg/m³', val: measurements.pm10 || 0, color: '#eab308' },
    { key: 'no2', label: 'NO₂', max: 180, unit: 'µg/m³', val: measurements.no2 || 0, color: '#22d3ee' },
    { key: 'so2', label: 'SO₂', max: 80, unit: 'µg/m³', val: measurements.so2 || 0, color: '#10b981' },
    { key: 'co', label: 'CO', max: 4, unit: 'mg/m³', val: measurements.co || 0, color: '#34d399' },
    { key: 'o3', label: 'O₃', max: 160, unit: 'µg/m³', val: measurements.o3 || 0, color: '#06b6d4' },
    { key: 'nh3', label: 'NH₃', max: 400, unit: 'µg/m³', val: measurements.nh3 || 0, color: '#38bdf8' }
  ];

  return (
    <div
      className="hud-panel hud-corner-bracket"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        height: isCollapsed ? 34 : 205,
        transition: 'height 0.25s ease-out',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(5, 14, 24, 0.94)',
        borderTop: '1px solid rgba(34, 211, 238, 0.28)',
        borderBottom: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(34, 211, 238, 0.12)',
        contain: 'content' // CSS containment to prevent whole-page layout recalculations
      }}
    >
      {/* Top Header / Collapser Bar */}
      <div style={{
        height: 28,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid rgba(34, 211, 238, 0.15)',
        background: 'rgba(34, 211, 238, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="hud-led cyan" />
            <span className="hud-label" style={{ fontWeight: 700, color: '#22d3ee', letterSpacing: '0.14em' }}>
              ATMOS TELEMETRY CONSOLE // DECK-C4
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>|</span>
          <span className="hud-label" style={{ color: '#94a3b8' }}>
            LOC: {currentStationName.slice(0, 34)} [{currentCoordinates}]
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="hud-status-badge">
            <span className="hud-led green" />
            ONLINE
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#22d3ee',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px'
            }}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Main Console Deck Body */}
      {!isCollapsed && (
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.1fr 1.1fr',
          gap: 16,
          padding: '8px 18px 10px',
          overflow: 'hidden'
        }}>
          {/* ======================================================== */}
          {/* MODULE 1: MULTI-BAND SPECTRUM ANALYZER & NEURAL TREND    */}
          {/* ======================================================== */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(34, 211, 238, 0.12)',
            paddingRight: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={13} color="#22d3ee" />
                <span className="hud-label">POLLUTANT SPECTRUM & INFERENCE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#f97316' }}>TREND: +4.2%</span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: currentAqi > 200 ? '#f97316' : '#10b981',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '1px 6px',
                  borderRadius: 2,
                  border: '1px solid rgba(34,211,238,0.2)'
                }}>
                  AQI {currentAqi}
                </span>
              </div>
            </div>

            {/* Visual Equalizer / Spectrum Bars with Orange Forecast Trendline */}
            <div style={{
              position: 'relative',
              height: 100,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: '6px 12px 4px',
              background: 'rgba(34, 211, 238, 0.02)',
              border: '1px solid rgba(34, 211, 238, 0.14)',
              borderRadius: 3
            }}>
              {/* Orange Forecast Curve directly from image */}
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  overflow: 'visible'
                }}
              >
                <path
                  d="M 18,65 Q 80,60 140,54 T 225,50 T 315,55"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(249, 115, 22, 0.6))' }}
                />
                <circle cx="140" cy="54" r="3" fill="#eab308" stroke="#050e18" strokeWidth="1.5" />
                <circle cx="225" cy="50" r="3.5" fill="#f97316" stroke="#050e18" strokeWidth="1.5" />
                <text x="146" y="48" fill="#eab308" fontSize="9" fontFamily="monospace" fontWeight="bold">13.45</text>
              </svg>

              {/* Spectrum Bars */}
              {spectrumPollutants.map((p) => {
                const ratio = Math.min(1, Math.max(0.12, p.val / p.max));
                const heightPct = Math.round(ratio * 72);
                return (
                  <div key={p.key} className="hud-spectrum-bar-container">
                    <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#94a3b8' }}>
                      {p.val}
                    </span>
                    <div className="hud-spectrum-bar-track">
                      <div
                        className="hud-spectrum-bar-fill"
                        style={{
                          height: `${heightPct}%`,
                          background: `linear-gradient(to top, #10b981 0%, #22d3ee 50%, ${p.color} 100%)`
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 600, color: '#22d3ee' }}>
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Status Ticker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>
              <span>DLinear Horizon: 24h</span>
              <span style={{ color: '#10b981' }}>● SENSORS ONLINE (7/7)</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MODULE 2: TACTICAL EQUALIZER & RANGE FILTER MATRIX       */}
          {/* ======================================================== */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(34, 211, 238, 0.12)',
            paddingRight: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={13} color="#22d3ee" />
                <span className="hud-label">EQUALIZER // SENSOR CONTROLS</span>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#22d3ee', fontWeight: 700 }}>
                2524 90
              </span>
            </div>

            {/* Equalizer Sliders with Smooth GPU Interaction */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              height: 100,
              background: 'rgba(34, 211, 238, 0.02)',
              border: '1px solid rgba(34, 211, 238, 0.14)',
              borderRadius: 3,
              padding: '6px 12px'
            }}>
              {/* Slider 1: AQI Ceiling Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#22d3ee' }}>{aqiCeiling || 500}</span>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={aqiCeiling || 500}
                  onChange={(e) => onAqiCeilingChange && onAqiCeilingChange(Number(e.target.value))}
                  className="hud-slider-vertical"
                  style={{ height: 56 }}
                />
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}>AQI</span>
              </div>

              {/* Slider 2: Wind Speed */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#10b981' }}>{windThreshold || 12}</span>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={windThreshold || 12}
                  onChange={(e) => onWindThresholdChange && onWindThresholdChange(Number(e.target.value))}
                  className="hud-slider-vertical"
                  style={{ height: 56 }}
                />
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}>WIND</span>
              </div>

              {/* Slider 3: Boundary Layer Height */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#eab308' }}>850</span>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  defaultValue="850"
                  className="hud-slider-vertical"
                  style={{ height: 56 }}
                />
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}>PBL</span>
              </div>

              {/* Slider 4: Humidity */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8' }}>62%</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  defaultValue="62"
                  className="hud-slider-vertical"
                  style={{ height: 56 }}
                />
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}>HUM</span>
              </div>

              {/* Slider 5: Confidence Index */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#a78bfa' }}>94</span>
                <input
                  type="range"
                  min="50"
                  max="100"
                  defaultValue="94"
                  className="hud-slider-vertical"
                  style={{ height: 56 }}
                />
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}>CONF</span>
              </div>
            </div>

            {/* Tactical Preset Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto' }}>
              {['ALL', 'Good', 'Moderate', 'Poor', 'Severe'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelectBucket && onSelectBucket(cat)}
                  style={{
                    background: selectedBucket === cat ? 'rgba(34, 211, 238, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${selectedBucket === cat ? '#22d3ee' : 'rgba(34, 211, 238, 0.15)'}`,
                    color: selectedBucket === cat ? '#22d3ee' : '#94a3b8',
                    fontFamily: 'monospace',
                    fontSize: 8.5,
                    padding: '2px 7px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  [{cat}]
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* MODULE 3: PURE CSS GPU ROTATING RADAR PPI SCANNER        */}
          {/* ======================================================== */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio size={13} color="#22d3ee" />
                <span className="hud-label">RADAR PPI SCANNER // 200KM</span>
              </div>
              <span className="hud-status-badge" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
                SWEEP ACTIVE
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              height: 100,
              background: 'rgba(34, 211, 238, 0.02)',
              border: '1px solid rgba(34, 211, 238, 0.14)',
              borderRadius: 3,
              padding: '4px 8px'
            }}>
              {/* Pure CSS Hardware-Accelerated Radar Display */}
              <div style={{
                position: 'relative',
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: '#040b15',
                border: '1px solid rgba(34, 211, 238, 0.35)',
                boxShadow: '0 0 14px rgba(34, 211, 238, 0.15)',
                overflow: 'hidden'
              }}>
                {/* Concentric Range Rings */}
                <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1px dashed rgba(34, 211, 238, 0.2)' }} />
                <div style={{ position: 'absolute', inset: 24, borderRadius: '50%', border: '1px solid rgba(34, 211, 238, 0.15)' }} />
                {/* Crosshairs */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(34, 211, 238, 0.25)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(34, 211, 238, 0.25)' }} />

                {/* GPU Rotating Sweep Beam via pure CSS (Zero JS lag) */}
                <div className="gpu-radar-sweep" />

                {/* Target Blips */}
                <div style={{ position: 'absolute', top: 20, left: 32, width: 3.5, height: 3.5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
                <div style={{ position: 'absolute', bottom: 26, right: 22, width: 3.5, height: 3.5, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 5px #f97316' }} />
                <div style={{ position: 'absolute', top: 48, right: 16, width: 3, height: 3, borderRadius: '50%', background: '#eab308', boxShadow: '0 0 4px #eab308' }} />
              </div>

              {/* Wind Vector Compass */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  border: '1px solid rgba(34, 211, 238, 0.28)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(34, 211, 238, 0.04)',
                  position: 'relative'
                }}>
                  <Compass size={24} color="#22d3ee" style={{ transform: 'rotate(-45deg)' }} />
                  <span style={{ position: 'absolute', top: 1, fontSize: 7, fontFamily: 'monospace', color: '#22d3ee' }}>N</span>
                </div>
                <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: '#22d3ee', fontWeight: 700 }}>
                  NW 3.8 m/s
                </span>
                <button
                  onClick={() => onToggleWind && onToggleWind(!isWindActive)}
                  style={{
                    background: isWindActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isWindActive ? '#10b981' : 'rgba(34, 211, 238, 0.2)'}`,
                    color: isWindActive ? '#10b981' : '#64748b',
                    fontSize: 8,
                    padding: '1px 5px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  WIND: {isWindActive ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
            </div>

            {/* System Status Tickers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8.5, fontFamily: 'monospace', color: '#64748b' }}>
              <span>GRID: CPCB 230</span>
              <span style={{ color: '#22d3ee' }}>LATENCY: 12ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TacticalBottomDeck);
