import React from 'react';
import { motion } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import { DoorOpen, DoorClosed } from 'lucide-react';

export default function GateControl() {
  const { state, dispatch, sendCommand } = useSystem();

  const toggle = () => {
    dispatch({ type: 'TOGGLE_GATE' });
    sendCommand(state.gateOpen ? 'GATE_CLOSE' : 'GATE_OPEN');
  };

  const c = state.gateOpen ? 'var(--green)' : 'var(--orange)';

  return (
    <div style={{
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid rgba(0,229,255,0.14)`,
      borderRadius: 12,
      padding: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div className="led" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
        <span className="panel-header-label" style={{ color: c }}>GATE CONTROL</span>
        <span className="data-label" style={{ marginLeft: 'auto', fontSize: 9 }}>
          SERVO: {state.gateOpen ? '90°' : '0°'}
        </span>
      </div>

      {/* Visual gate */}
      <div style={{
        height: 44, borderRadius: 8, overflow: 'hidden', position: 'relative',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(0,229,255,0.12)',
        display: 'flex', alignItems: 'center', marginBottom: 12,
      }}>
        {/* Left panel */}
        <motion.div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${c}22, ${c}0a)`,
            borderRight: `1px solid ${c}50`,
          }}
          animate={{ width: state.gateOpen ? '4%' : '50%' }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        />
        {/* State label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="data-value" style={{ fontSize: 11, letterSpacing: '0.18em', color: c }}>
            {state.gateOpen ? '▸ OPEN ◂' : '◂ CLOSED ▸'}
          </span>
        </div>
        {/* Right panel */}
        <motion.div
          style={{
            height: '100%', marginLeft: 'auto',
            background: `linear-gradient(270deg, ${c}22, ${c}0a)`,
            borderLeft: `1px solid ${c}50`,
          }}
          animate={{ width: state.gateOpen ? '4%' : '50%' }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Servo track */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="data-label" style={{ fontSize: 8, width: 36 }}>SERVO</span>
        <div className="progress-track" style={{ flex: 1 }}>
          <motion.div
            className="progress-fill"
            style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }}
            animate={{ width: state.gateOpen ? '100%' : '0%' }}
            transition={{ duration: 0.55 }}
          />
        </div>
        <span className="data-label" style={{ fontSize: 8, width: 24, textAlign: 'right' }}>
          {state.gateOpen ? '90°' : '0°'}
        </span>
      </div>

      {/* Button */}
      <button
        onClick={toggle}
        className={`btn-hud ${state.gateOpen ? 'btn-red' : 'btn-green'}`}
        style={{ fontSize: 10 }}
      >
        {state.gateOpen ? <><DoorClosed size={12} /> CLOSE GATE</> : <><DoorOpen size={12} /> OPEN GATE</>}
      </button>
    </div>
  );
}
