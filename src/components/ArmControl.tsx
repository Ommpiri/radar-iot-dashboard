import React from 'react';
import { motion } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import { Shield, ShieldAlert } from 'lucide-react';

export default function ArmControl() {
  const { state, dispatch, sendCommand } = useSystem();

  const toggle = () => {
    const next = !state.armed;
    dispatch({ type: 'TOGGLE_ARM' });
    sendCommand(next ? 'ARM' : 'DISARM');
  };

  const c = state.armed ? 'var(--red)' : 'var(--cyan)';
  const cAlpha = state.armed ? 'rgba(255,23,68,' : 'rgba(0,229,255,';

  return (
    <div style={{
      background: state.armed ? 'rgba(30,4,8,0.6)' : 'rgba(0,0,0,0.25)',
      border: `1px solid ${state.armed ? 'rgba(255,23,68,0.35)' : 'rgba(0,229,255,0.18)'}`,
      borderRadius: 12,
      padding: 14,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Armed diagonal pattern */}
      {state.armed && (
        <div className="armed-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, position: 'relative' }}>
        <div className="led" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
        <span className="panel-header-label" style={{ color: c }}>ARM CONTROL</span>
      </div>

      {/* Icon + state */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>

        {/* Icon ring */}
        <div style={{ position: 'relative' }}>
          {/* Pulse rings — armed only */}
          {state.armed && [0, 1].map(i => (
            <motion.div key={i}
              style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                border: `1px solid ${cAlpha}0.4)`,
              }}
              animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
              transition={{ duration: 1.8, delay: i * 0.9, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle, ${cAlpha}0.15), ${cAlpha}0.03))`,
            border: `1.5px solid ${cAlpha}0.5)`,
            boxShadow: `0 0 ${state.armed ? 28 : 16}px ${cAlpha}0.3)`,
          }}>
            {state.armed
              ? <ShieldAlert size={28} style={{ color: c }} />
              : <Shield size={28} style={{ color: c }} />
            }
          </div>
        </div>

        {/* State label */}
        <div style={{ textAlign: 'center' }}>
          <motion.div
            key={state.armed ? 'a' : 'd'}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="data-value"
            style={{ fontSize: 18, letterSpacing: '0.2em', color: c, textShadow: `0 0 16px ${c}` }}
          >
            {state.armed ? 'ARMED' : 'DISARMED'}
          </motion.div>
          <div className="data-label" style={{ marginTop: 3, fontSize: 9 }}>
            {state.armed ? 'Active monitoring · Alerts ON' : 'Passive monitoring · Alerts OFF'}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggle}
          className={`btn-hud ${state.armed ? 'btn-red' : 'btn-cyan'}`}
          style={{ letterSpacing: '0.12em' }}
        >
          {state.armed ? '⚡ DISARM SYSTEM' : '🔒 ARM SYSTEM'}
        </button>

        {/* LED indicators */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { label: 'BUZZER', active: state.armed, warn: true },
            { label: 'ALERTS', active: state.armed, warn: true },
            { label: 'SCAN',   active: true,         warn: false },
          ].map(({ label, active, warn }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div
                className={active ? (warn ? 'led led-red' : 'led led-green') : 'led led-dim'}
                style={active && warn ? { animation: state.armed ? 'pulse-glow 1s ease-in-out infinite' : 'none' } : undefined}
              />
              <span className="data-label" style={{ fontSize: 8, color: active ? 'rgba(200,230,245,0.6)' : 'rgba(255,255,255,0.2)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
