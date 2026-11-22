import React, { useEffect, useRef, useState, memo } from 'react';
import { interpolateWindVector } from '../services/windService';
import { Wind, Gauge, Compass, Eye, EyeOff } from 'lucide-react';

function WindOverlay({ map, isActive = true }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [particleDensity, setParticleDensity] = useState(850);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize and run the 60fps Particle Streamline Simulation
  useEffect(() => {
    if (!map || !isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI canvas dimensions matching map viewport
    const resizeCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    };
    resizeCanvas();

    // Geographic bounding box for India & surrounding maritime corridors
    const bounds = {
      minLat: 6.5,
      maxLat: 36.5,
      minLon: 66.5,
      maxLon: 98.5
    };

    // Helper to spawn or reset a particle
    const createParticle = () => {
      const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      const lon = bounds.minLon + Math.random() * (bounds.maxLon - bounds.minLon);
      const maxAge = 40 + Math.floor(Math.random() * 50);
      return {
        lat,
        lon,
        age: Math.floor(Math.random() * maxAge),
        maxAge,
        speed: 3.0
      };
    };

    // Generate initial particle pool
    particlesRef.current = Array.from({ length: particleDensity }, () => createParticle());

    let isMapMoving = false;
    const onMoveStart = () => {
      isMapMoving = true;
    };
    const onMoveEnd = () => {
      isMapMoving = false;
      resizeCanvas();
    };

    map.on('movestart', onMoveStart);
    map.on('zoomstart', onMoveStart);
    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);
    map.on('resize', resizeCanvas);

    // Dynamic color ramp based on wind velocity:
    // Calm (0-2.5 m/s): Emerald #10b981
    // Moderate (2.5-5.0 m/s): Electric Cyan #22d3ee / #38d9a9
    // Strong (>5.0 m/s): Vibrant Coral/Amber #f97316
    const getSpeedColor = (speed, alpha) => {
      if (speed > 5.0) {
        return `rgba(249, 115, 22, ${alpha})`;
      } else if (speed > 3.0) {
        return `rgba(34, 211, 238, ${alpha})`;
      } else if (speed > 1.8) {
        return `rgba(56, 217, 169, ${alpha})`;
      } else {
        return `rgba(16, 185, 129, ${alpha})`;
      }
    };

    // Core Animation Frame Loop (60 FPS on GPU)
    const render = () => {
      if (!isActive) return;

      if (!isMapMoving) {
        // Semi-transparent trailing fade for bioluminescent streamline ribbons
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';

        const particles = particlesRef.current;
        const currentSpeed = speedMultiplier;

        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.age++;

          if (p.age > p.maxAge || p.lat < bounds.minLat || p.lat > bounds.maxLat || p.lon < bounds.minLon || p.lon > bounds.maxLon) {
            // Respawn
            particles[i] = createParticle();
            continue;
          }

          // Sample wind vector field at current (lat, lon)
          const wind = interpolateWindVector(p.lat, p.lon);
          p.speed = wind.speed;

          // Convert current lat/lon to screen pixel coordinates
          const startPt = map.latLngToContainerPoint([p.lat, p.lon]);

          // Compute advection step along (u, v) in degrees
          // u: eastward (lon), v: northward (lat)
          const latStep = (wind.v * 0.0028 * currentSpeed);
          const lonStep = (wind.u * 0.0028 * currentSpeed) / Math.cos((p.lat * Math.PI) / 180);

          p.lat += latStep;
          p.lon += lonStep;

          const endPt = map.latLngToContainerPoint([p.lat, p.lon]);

          // Skip drawing if outside screen viewport
          if (
            endPt.x < -20 ||
            endPt.x > canvas.width + 20 ||
            endPt.y < -20 ||
            endPt.y > canvas.height + 20
          ) {
            particles[i] = createParticle();
            continue;
          }

          // Compute life alpha: fade in and fade out
          const lifeProgress = p.age / p.maxAge;
          const alpha = lifeProgress < 0.2
            ? lifeProgress * 4.5
            : lifeProgress > 0.8
            ? (1.0 - lifeProgress) * 4.5
            : 0.85;

          ctx.beginPath();
          ctx.strokeStyle = getSpeedColor(wind.speed, Math.max(0.05, Math.min(0.9, alpha)));
          ctx.moveTo(startPt.x, startPt.y);
          ctx.lineTo(endPt.x, endPt.y);
          ctx.stroke();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      map.off('movestart', onMoveStart);
      map.off('zoomstart', onMoveStart);
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onMoveEnd);
      map.off('resize', resizeCanvas);
    };
  }, [map, isActive, speedMultiplier, particleDensity]);

  if (!isActive) return null;

  return (
    <>
      {/* 1. Fluid Canvas Streamline Layer */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 400
        }}
      />

      {/* 2. Tactical Atmospheric Wind HUD Overlay (Floating Bottom-Left) */}
      <div
        className="hud-panel hud-corner-bracket"
        style={{
          position: 'absolute',
          bottom: 220,
          left: 14,
          zIndex: 1150,
          padding: '8px 14px',
          background: 'rgba(5, 14, 24, 0.94)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7), 0 0 12px rgba(16, 185, 129, 0.15)',
          fontFamily: 'monospace',
          color: '#f1f5f9',
          minWidth: 260
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wind size={13} color="#10b981" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', letterSpacing: '0.12em' }}>
              ATMOSPHERIC 10M WIND VECTORS
            </span>
          </div>
          <span className="hud-status-badge" style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', fontSize: 8 }}>
            <span className="hud-led green" />
            LIVE
          </span>
        </div>

        {/* Speed & Streamline Telemetry Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, background: '#10b981', borderRadius: 1 }} />
            <span>&lt;2 m/s (Calm)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, background: '#22d3ee', borderRadius: 1 }} />
            <span>2-5 m/s (Breeze)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, background: '#f97316', borderRadius: 1 }} />
            <span>&gt;5 m/s (Advection)</span>
          </div>
        </div>

        {/* Quick Speed Velocity Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(34, 211, 238, 0.12)', paddingTop: 5 }}>
          <span style={{ fontSize: 8.5, color: '#64748b' }}>STREAMLINE FLOW:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[0.5, 1.0, 1.8].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                style={{
                  background: speedMultiplier === s ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${speedMultiplier === s ? '#10b981' : 'rgba(34, 211, 238, 0.15)'}`,
                  color: speedMultiplier === s ? '#10b981' : '#94a3b8',
                  fontSize: 8.5,
                  padding: '1px 6px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(WindOverlay);
