import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import { Shield, ShieldOff } from 'lucide-react';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current, end = value;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 160, 1);
      setDisplay(start + (end - start) * t);
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{Math.round(display)}</>;
}

export default function LiveDataPanel() {
  const { state } = useSystem();

  const distColor =
    state.currentDistance < 15 ? 'var(--red)'
    : state.currentDistance < 25 ? 'var(--orange)'
    : 'var(--green)';

  const statusLabel =
    state.currentDistance < 15 ? 'DANGER'
    : state.currentDistance < 25 ? 'WARNING'
    : 'CLEAR';

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div className="panel-header">
        <div className="panel-dot" />
        <span className="panel-header-label">LIVE TELEMETRY</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Angle */}
        <DataCard
          label="AZIMUTH ANGLE"
          value={state.currentAngle}
          unit="°"
          max={180}
          color="var(--cyan)"
        />

        {/* Distance */}
        <DataCard
          label="DISTANCE"
          value={state.currentDistance}
          unit="cm"
          max={40}
          color={distColor}
          alert={state.alert}
        />

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

        {/* Detection status */}
        <div>
          <div className="data-label" style={{ marginBottom: 6 }}>DETECTION STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.div
              className="led"
              style={{ background: distColor, boxShadow: `0 0 8px ${distColor}` }}
              animate={{ scale: state.alert ? [1, 1.4, 1] : 1 }}
              transition={{ repeat: state.alert ? Infinity : 0, duration: 0.5 }}
            />
            <span className="data-value" style={{ fontSize: 15, color: distColor, textShadow: `0 0 10px ${distColor}` }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* System mode */}
        <div>
          <div className="data-label" style={{ marginBottom: 6 }}>SYSTEM MODE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {state.armed
              ? <Shield size={15} style={{ color: 'var(--red)', flexShrink: 0 }} />
              : <ShieldOff size={15} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
            }
            <span className="data-value" style={{
              fontSize: 15,
              color: state.armed ? 'var(--red)' : 'var(--cyan)',
              textShadow: `0 0 10px ${state.armed ? 'var(--red)' : 'var(--cyan)'}`,
            }}>
              {state.armed ? 'ARMED' : 'DISARMED'}
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Timestamp */}
        <div className="data-label" style={{ fontSize: 9, textAlign: 'center', opacity: 0.4 }}>
          UPDATED {new Date(state.lastUpdate).toLocaleTimeString('en-US', { hour12: false })}
        </div>
      </div>
    </div>
  );
}

function DataCard({ label, value, unit, max, color, alert }: {
  label: string; value: number; unit: string;
  max: number; color: string; alert?: boolean;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{
      background: 'rgba(0,0,0,0.28)',
      border: `1px solid ${color}28`,
      borderRadius: 10,
      padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span className="data-label">{label}</span>
        <span className="data-label" style={{ opacity: 0.35 }}>/{max}{unit}</span>
      </div>

      <motion.div
        key={value}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="data-value"
        style={{ fontSize: 26, color, textShadow: `0 0 14px ${color}` }}
      >
        <AnimatedNumber value={value} />
        <span style={{ fontSize: 12, marginLeft: 3, opacity: 0.7 }}>{unit}</span>
      </motion.div>

      <div className="progress-track" style={{ marginTop: 8 }}>
        <motion.div
          className="progress-fill"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.18 }}
        />
      </div>
    </div>
  );
}
