import React from 'react';
import { Activity, MapPin, Navigation, Info, Layers, Sparkles, History } from 'lucide-react';

export default function Navbar({
  stationCount,
  activeMode,
  setActiveMode,
  onLocateUser,
  isLocating,
  onOpenAbout
}) {
  return (
    <header className="glass-panel" style={{
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      zIndex: 1000,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap'
    }}>
      {/* Brand & Mission Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #06B6D4 0%, #10B981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
        }}>
          <Activity size={20} color="#080C14" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 20, margin: 0, letterSpacing: '-0.03em', color: '#F8FAFC' }}>
              AtmosQI
            </h1>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06B6D4',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              Open-Source
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
            India Air Quality Explorer & Neural Forecast
          </p>
        </div>
      </div>

      {/* Central Mode Switcher: Ground Truth vs Satellite ML vs Time-Travel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.35)',
        padding: 3,
        borderRadius: 10,
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <button
          onClick={() => setActiveMode('stations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeMode === 'stations' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
            color: activeMode === 'stations' ? '#38BDF8' : '#94A3B8',
            boxShadow: activeMode === 'stations' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <MapPin size={14} />
          Live Stations ({stationCount})
        </button>

        <button
          onClick={() => setActiveMode('satellite')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeMode === 'satellite' ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.25))' : 'transparent',
            color: activeMode === 'satellite' ? '#C084FC' : '#94A3B8',
            boxShadow: activeMode === 'satellite' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <Sparkles size={14} />
          10km Satellite Grid
        </button>

        <button
          onClick={() => setActiveMode('timeline')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeMode === 'timeline' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25))' : 'transparent',
            color: activeMode === 'timeline' ? '#34D399' : '#94A3B8',
            boxShadow: activeMode === 'timeline' ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none'
          }}
        >
          <History size={14} />
          Time Travel (2018-2020)
        </button>
      </div>

      {/* Right Controls: Locate & About */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onLocateUser}
          disabled={isLocating}
          title="Query live air quality at your GPS coordinates"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34D399',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: isLocating ? 'wait' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Navigation size={14} className={isLocating ? 'animate-spin' : ''} />
          {isLocating ? 'Detecting GPS...' : 'My Live Air'}
        </button>

        <button
          onClick={onOpenAbout}
          title="Data Sources, NAQI Standards & AI Details"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Info size={16} />
        </button>
      </div>
    </header>
  );
}
