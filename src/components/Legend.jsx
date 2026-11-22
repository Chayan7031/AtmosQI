import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { AQI_BUCKETS } from '../constants/aqiStandards';

export default function Legend({ style = {} }) {
  const [collapsed, setCollapsed] = useState(true); // Collapsed by default for clean Google Maps look

  const bands = [
    { label: 'Good', range: '0 - 50', color: AQI_BUCKETS.GOOD.color },
    { label: 'Satisfactory', range: '51 - 100', color: AQI_BUCKETS.SATISFACTORY.color },
    { label: 'Moderate', range: '101 - 200', color: AQI_BUCKETS.MODERATE.color },
    { label: 'Poor', range: '201 - 300', color: AQI_BUCKETS.POOR.color },
    { label: 'Very Poor', range: '301 - 400', color: AQI_BUCKETS.VERY_POOR.color },
    { label: 'Severe', range: '401 - 500+', color: AQI_BUCKETS.SEVERE.color },
  ];

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        bottom: 190,
        right: 16,
        zIndex: 980,
        padding: '6px 12px',
        fontSize: 11,
        minWidth: 180,
        borderRadius: 14,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: '#94A3B8',
          fontWeight: 700,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: collapsed ? 0 : 6
        }}
      >
        <span>AQI Scale</span>
        {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {bands.map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: b.color,
                  boxShadow: `0 0 6px ${b.color}55`
                }} />
                <span style={{ color: '#E2E8F0', fontSize: 11 }}>{b.label}</span>
              </div>
              <span style={{ color: '#64748B', fontFamily: 'monospace', fontSize: 10 }}>{b.range}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
