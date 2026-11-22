import React from 'react';
import { X, Calculator, ShieldCheck, AlertCircle } from 'lucide-react';
import { CPCB_BREAKPOINTS } from '../constants/aqiStandards';

export default function CalculationExplainerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 5000,
      background: 'rgba(4, 7, 13, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div className="glass-panel" style={{
        maxWidth: 680,
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: 24,
        background: '#0a101d',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.15)',
        borderRadius: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calculator color="#00f0ff" size={20} />
            <h2 style={{ fontSize: 18, color: '#00f0ff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              CPCB NAQI Calculation Standard
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginTop: 16, color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>
          <p>
            India's National Air Quality Index (NAQI) uses a linear piecewise formula established by the <strong>Central Pollution Control Board (CPCB)</strong>:
          </p>
          <div style={{
            background: 'rgba(0, 240, 255, 0.05)',
            border: '1px dashed rgba(0, 240, 255, 0.3)',
            padding: '12px 16px',
            borderRadius: 8,
            margin: '14px 0',
            fontFamily: 'monospace',
            color: '#00f0ff',
            textAlign: 'center'
          }}>
            Ip = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (Cp - B_lo) + I_lo
          </div>
          <p>
            Where <code>Cp</code> is pollutant concentration, <code>[B_lo, B_hi]</code> is concentration bracket, and <code>[I_lo, I_hi]</code> is index range.
          </p>

          <h3 style={{ color: '#f8fafc', fontSize: 14, marginTop: 18, marginBottom: 8 }}>
            Key Validation Rules:
          </h3>
          <ul style={{ paddingLeft: 20 }}>
            <li>At least 3 pollutants must be measured.</li>
            <li>One of the measured pollutants <strong>must be PM2.5 or PM10</strong>.</li>
            <li>The composite AQI is the <strong>maximum sub-index</strong> among all qualifying pollutants.</li>
          </ul>

          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <button
              onClick={onClose}
              style={{
                background: 'linear-gradient(135deg, #00f0ff 0%, #00e676 100%)',
                border: 'none',
                color: '#040810',
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
