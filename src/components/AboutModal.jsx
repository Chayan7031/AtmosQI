import React from 'react';
import { X, ShieldCheck, Database, Cpu, ExternalLink, BookOpen } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: 'rgba(4, 7, 13, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: 620,
        maxWidth: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '28px 32px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: '#94A3B8',
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <h2 style={{ fontSize: 22, color: '#F8FAFC', marginBottom: 8, letterSpacing: '-0.02em' }}>
          About AtmosQI
        </h2>
        <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5, marginBottom: 20 }}>
          AtmosQI is an open-source environmental data platform that makes public air quality data across India transparent, interactive, and predictive.
        </p>

        {/* Core Pillars Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 24 }}>
          {/* Pillar 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 10,
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Database size={16} color="#06B6D4" />
              <strong style={{ fontSize: 13, color: '#E2E8F0' }}>Dual-Tier Data Architecture</strong>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.45, margin: 0 }}>
              Seamlessly integrates <strong>230 physical CPCB/SPCB ground monitors</strong> (2015–2020) with a continuous <strong>10km satellite-derived ML surface grid</strong> (2018–2026, CREA/Zenodo) and <strong>real-time Copernicus telemetry</strong>.
            </p>
          </div>

          {/* Pillar 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 10,
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={16} color="#10B981" />
              <strong style={{ fontSize: 13, color: '#E2E8F0' }}>Scientific Integrity & NAQI Standards</strong>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.45, margin: 0 }}>
              Follows the official Central Pollution Control Board (CPCB) maximum sub-index piecewise interpolation formula. Missing values are never treated as zero, and physical sensor readings are strictly distinguished from satellite estimates.
            </p>
          </div>

          {/* Pillar 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 10,
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Cpu size={16} color="#8B5CF6" />
              <strong style={{ fontSize: 13, color: '#E2E8F0' }}>Edge Deep Learning (ONNX Wasm)</strong>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.45, margin: 0 }}>
              Employs a lightweight DLinear neural network running 100% in the user's browser via WebAssembly, predicting multi-step 24-hour trajectories and morning temperature inversion spikes with zero cloud latency.
            </p>
          </div>
        </div>

        {/* Links to Markdown Specifications */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} color="#06B6D4" />
            <span style={{ color: '#E2E8F0' }}>Check the repository's technical specifications for full schemas.</span>
          </div>
          <span style={{ color: '#06B6D4', fontWeight: 600 }}>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
