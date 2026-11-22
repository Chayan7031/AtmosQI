import React, { useState, useRef, useEffect, memo } from 'react';
import {
  Crosshair,
  Layers,
  Wind,
  Navigation,
  Info,
  Radio,
  X
} from 'lucide-react';
import { searchUniversalLocations } from '../services/geoService';

function TacticalHUDOverlay({
  searchQuery,
  setSearchQuery,
  allStations = [],
  onSelectStation,
  onSelectUniversalPlace,
  activeMode,
  setActiveMode,
  isWindActive,
  onToggleWind,
  onLocateUser,
  isLocating,
  onOpenAbout,
  stationCount = 230,
  peakAqi = 219
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimerRef = useRef(null);

  // Live Omnibox Autocomplete with Debounce (180ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const places = await searchUniversalLocations(searchQuery, allStations);
        setSuggestions(places || []);
        setIsOpen(true);
      } catch (err) {
        console.error("Tactical Geocoding query failed:", err);
      }
    }, 180);

    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, allStations]);

  return (
    <>
      {/* ======================================================== */}
      {/* 1. TOP-LEFT HUD: SYSTEM ID, TARGET RING & OMNIBOX        */}
      {/* ======================================================== */}
      <div
        className="hud-panel hud-corner-bracket"
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 1200,
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minWidth: 300,
          maxWidth: 360,
          background: 'rgba(5, 14, 24, 0.94)',
          border: '1px solid rgba(34, 211, 238, 0.28)'
        }}
      >
        {/* System Designation matching "DSIV UM/GFE 4" from image */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Concentric Circular HUD Target */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1.5px solid #22d3ee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.35)',
              position: 'relative'
            }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px dashed #10b981' }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22d3ee' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#f1f5f9', letterSpacing: '0.08em' }}>
                  ATMOS // GFE-4
                </span>
                <span className="hud-status-badge" style={{ padding: '1px 5px', fontSize: 8.5 }}>
                  C2 NODE
                </span>
              </div>
              <span className="hud-label" style={{ fontSize: 8.5, color: '#64748b' }}>
                INDIAN AIRSPACE TELEMETRY
              </span>
            </div>
          </div>

          {/* Secondary Metric matching "77 / 950" from image */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#22d3ee' }}>
              77 / 950
            </div>
            <div style={{ fontSize: 8.5, fontFamily: 'monospace', color: '#64748b' }}>
              SECTORS ACTIVE
            </div>
          </div>
        </div>

        {/* Tactical Search Omnibox */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(34, 211, 238, 0.04)',
            border: '1px solid rgba(34, 211, 238, 0.25)',
            borderRadius: 2,
            padding: '5px 8px'
          }}>
            <Crosshair size={13} color="#22d3ee" />
            <input
              type="text"
              placeholder="Search station, city, or coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: 11,
                fontFamily: 'monospace',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Dropdown Suggestions */}
          {isOpen && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: '#050e18',
              border: '1px solid #22d3ee',
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 2000
            }}>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setIsOpen(false);
                    if (item.type === 'station') {
                      onSelectStation(item.rawStation);
                    } else {
                      onSelectUniversalPlace(item);
                    }
                  }}
                  style={{
                    padding: '7px 10px',
                    borderBottom: '1px solid rgba(34, 211, 238, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 10.5,
                    fontFamily: 'monospace'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ color: '#22d3ee', fontWeight: 600 }}>{item.title}</div>
                    <div style={{ color: '#64748b', fontSize: 9.5 }}>{item.subtitle}</div>
                  </div>
                  <span style={{ fontSize: 8.5, color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 3px' }}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP-CENTER HUD: TACTICAL MODE SELECTOR & GPS LOCK     */}
      {/* ======================================================== */}
      <div
        className="hud-panel hud-corner-bracket"
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1200,
          padding: '5px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(5, 14, 24, 0.94)',
          border: '1px solid rgba(34, 211, 238, 0.28)'
        }}
      >
        <button
          onClick={() => setActiveMode('stations')}
          style={{
            background: activeMode === 'stations' ? 'rgba(34, 211, 238, 0.2)' : 'transparent',
            border: `1px solid ${activeMode === 'stations' ? '#22d3ee' : 'rgba(255,255,255,0.1)'}`,
            color: activeMode === 'stations' ? '#22d3ee' : '#94a3b8',
            padding: '4px 10px',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Radio size={12} />
          STATIONS [{stationCount}]
        </button>

        <button
          onClick={() => setActiveMode('satellite')}
          style={{
            background: activeMode === 'satellite' ? 'rgba(34, 211, 238, 0.2)' : 'transparent',
            border: `1px solid ${activeMode === 'satellite' ? '#22d3ee' : 'rgba(255,255,255,0.1)'}`,
            color: activeMode === 'satellite' ? '#22d3ee' : '#94a3b8',
            padding: '4px 10px',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Layers size={12} />
          10KM SATELLITE
        </button>

        <button
          onClick={() => onToggleWind(!isWindActive)}
          style={{
            background: isWindActive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isWindActive ? '#10b981' : 'rgba(34, 211, 238, 0.2)'}`,
            color: isWindActive ? '#10b981' : '#94a3b8',
            boxShadow: isWindActive ? '0 0 10px rgba(16, 185, 129, 0.35)' : 'none',
            padding: '4px 10px',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span className={`hud-led ${isWindActive ? 'green' : ''}`} style={{ background: isWindActive ? '#10b981' : '#64748b' }} />
          <Wind size={12} color={isWindActive ? '#10b981' : '#94a3b8'} />
          WIND ADVECTION {isWindActive ? '[ACTIVE]' : '[STANDBY]'}
        </button>

        <button
          onClick={onLocateUser}
          style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(16,185,129,0.2) 100%)',
            border: '1px solid #22d3ee',
            color: '#22d3ee',
            padding: '4px 10px',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Navigation size={12} />
          {isLocating ? 'LOCATING...' : 'MY LIVE AIR'}
        </button>

        <button
          onClick={onOpenAbout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#94a3b8',
            padding: '4px 7px',
            borderRadius: 2,
            cursor: 'pointer'
          }}
        >
          <Info size={13} />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. TOP-RIGHT HUD: 63,224 METRIC & MINI RADAR GAUGE       */}
      {/* ======================================================== */}
      <div
        className="hud-panel hud-corner-bracket-alt"
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 1200,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(5, 14, 24, 0.94)',
          border: '1px solid rgba(34, 211, 238, 0.28)'
        }}
      >
        {/* Main Glowing Number matching "63,224" from reference image */}
        <div>
          <div style={{
            fontSize: 21,
            fontFamily: 'monospace',
            fontWeight: 900,
            color: '#22d3ee',
            letterSpacing: '0.06em',
            textShadow: '0 0 12px rgba(34, 211, 238, 0.5)'
          }}>
            63,224
          </div>
          <div className="hud-label" style={{ fontSize: 8.5, color: '#64748b' }}>
            ACTIVE PIXELS // INDIA
          </div>
        </div>

        {/* Status indicator matching "A800 ACTIVE" from image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <span className="hud-status-badge">
            <span className="hud-led green" />
            ONLINE
          </span>
          <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}>
            A800 ACTIVE
          </span>
        </div>

        {/* Circular Radar Gauge matching "219" from image */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1.5px solid rgba(34, 211, 238, 0.35)',
          background: 'rgba(34, 211, 238, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 8px rgba(34, 211, 238, 0.2)'
        }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: '#f97316' }}>
            {peakAqi}
          </span>
          <span style={{ fontSize: 7, fontFamily: 'monospace', color: '#94a3b8' }}>
            PEAK
          </span>
        </div>
      </div>
    </>
  );
}

export default memo(TacticalHUDOverlay);
