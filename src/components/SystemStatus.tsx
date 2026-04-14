import React from 'react';
import { motion } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import { Cpu, Wifi, Activity, Radio, Zap } from 'lucide-react';

const rows = [
  { icon: Cpu,      label: 'CONTROLLER',  key: 'controller' },
  { icon: Radio,    label: 'ULTRASONIC',  key: 'ultrasonic' },
  { icon: Activity, label: 'SERVO MOTOR', key: 'servo' },
];

export default function SystemStatus() {
  const { state } = useSystem();
  const latency = state.latency;
  const bars = Math.max(1, Math.min(5, 5 - Math.floor(latency / 15)));
  const latColor = latency < 20 ? 'var(--green)' : latency < 50 ? 'var(--orange)' : 'var(--red)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="led led-cyan" />
        <span className="panel-header-label" style={{ color: 'var(--cyan)' }}>SYSTEM STATUS</span>
      </div>

      {/* Hardware rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(({ icon: Icon, label, key }) => {
          const ok = state.sensorHealth[key as keyof typeof state.sensorHealth];
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8,
              background: 'rgba(0,0,0,0.28)',
              border: `1px solid ${ok ? 'rgba(0,229,255,0.1)' : 'rgba(255,23,68,0.25)'}`,
            }}>
              <Icon size={12} style={{ color: ok ? 'var(--cyan)' : 'var(--red)', flexShrink: 0 }} />
              <span className="data-label" style={{ flex: 1 }}>{label}</span>
              <div className={ok ? 'led led-green' : 'led led-red'} />
              <span className="font-mono" style={{
                fontSize: 9, letterSpacing: '0.1em',
                color: ok ? 'var(--green)' : 'var(--red)',
                minWidth: 42, textAlign: 'right',
              }}>
                {ok ? 'ONLINE' : 'FAULT'}
              </span>
            </div>
          );
        })}

        {/* Connection mode */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 8,
          background: 'rgba(0,0,0,0.28)',
          border: 'rgba(0,229,255,0.1) solid 1px',
        }}>
          <Wifi size={12} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
          <span className="data-label" style={{ flex: 1 }}>CONNECTION</span>
          <div className={state.connected ? 'led led-green' : 'led led-red'} />
          <span className="font-mono" style={{
            fontSize: 9, letterSpacing: '0.1em',
            color: 'var(--cyan)',
            minWidth: 42, textAlign: 'right',
          }}>
            {state.connectionMode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Latency bars */}
      <div style={{
        padding: '8px 10px', borderRadius: 8,
        background: 'rgba(0,0,0,0.28)',
        border: '1px solid rgba(0,229,255,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={11} style={{ color: 'var(--cyan)' }} />
            <span className="data-label">LATENCY</span>
          </div>
          <span className="font-mono" style={{ fontSize: 10, color: latColor, fontWeight: 700 }}>{latency}ms</span>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div key={i}
              style={{
                flex: 1,
                borderRadius: 2,
                height: `${40 + i * 15}%`,
              }}
              animate={{
                background: i < bars ? latColor : 'rgba(255,255,255,0.08)',
                boxShadow: i < bars ? `0 0 4px ${latColor}` : 'none',
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Mode badge */}
      <div style={{
        textAlign: 'center',
        padding: '5px 8px', borderRadius: 6,
        background: 'rgba(0,229,255,0.04)',
        border: '1px solid rgba(0,229,255,0.1)',
      }}>
        <span className="font-mono" style={{ fontSize: 9, color: 'rgba(0,229,255,0.5)', letterSpacing: '0.12em' }}>
          {state.connectionMode === 'demo' ? '◉ SIMULATION MODE' : `◉ ${state.connectionMode.toUpperCase()} LIVE`}
        </span>
      </div>
    </div>
  );
}
