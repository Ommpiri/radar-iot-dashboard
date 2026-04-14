import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemProvider, useSystem } from './context/SystemContext';
import ParticleBackground from './components/ParticleBackground';
import RadarDisplay from './components/RadarDisplay';
import LiveDataPanel from './components/LiveDataPanel';
import ArmControl from './components/ArmControl';
import GateControl from './components/GateControl';
import AlertSystem from './components/AlertSystem';
import SystemStatus from './components/SystemStatus';
import EventLog from './components/EventLog';
import DetectionGraph from './components/DetectionGraph';
import ConnectionModal from './components/ConnectionModal';
import { Crosshair, PlugZap, BarChart2, List } from 'lucide-react';

/* ── Clock ─────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono" style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.08em' }}>
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  );
}

/* ── Main Dashboard ─────────────────────────────────────── */
function Dashboard() {
  const { state } = useSystem();
  const [showConnect, setShowConnect] = useState(false);
  const [bottomTab, setBottomTab]     = useState<'graph' | 'log'>('graph');
  const [rightTab, setRightTab]       = useState<'controls' | 'status'>('controls');

  const isArmed = state.armed;
  const hwConnected = state.connectionMode !== 'demo';

  return (
    <div className="grid-bg" style={{
      background: 'var(--bg)',
      width: '100vw', height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      gap: 10,
      position: 'relative',
    }}>
      <ParticleBackground />

      {/* Connection modal */}
      <AnimatePresence>
        {showConnect && <ConnectionModal onClose={() => setShowConnect(false)} />}
      </AnimatePresence>

      {/* Alert flash overlay */}
      <AnimatePresence>
        {state.alert && (
          <motion.div
            className="anim-alert"
            style={{
              position: 'fixed', inset: 0, zIndex: 5,
              background: 'rgba(255,23,68,0.06)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════
          HEADER
      ═══════════════════════════════════ */}
      <header className="panel" style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 28, height: 28 }}>
            <Crosshair size={28} style={{ color: 'var(--cyan)', position: 'absolute' }} />
          </div>
          <div>
            <div className="font-hud text-cyan" style={{ fontSize: 14, letterSpacing: '0.25em', fontWeight: 700 }}>
              RADAR<span style={{ color: 'var(--muted)' }}>.</span>IDS
            </div>
            <div className="font-mono text-muted" style={{ fontSize: 9, letterSpacing: '0.12em' }}>
              INTELLIGENT DETECTION SYSTEM v2.4
            </div>
          </div>
        </div>

        {/* Center status chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AnimatePresence>
            {isArmed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.85, width: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(255,23,68,0.12)',
                  border: '1px solid rgba(255,23,68,0.4)',
                  overflow: 'hidden', whiteSpace: 'nowrap',
                }}
              >
                <div className="led led-red anim-pulse" />
                <span className="font-hud text-red" style={{ fontSize: 9, letterSpacing: '0.18em' }}>ARMED</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Alert chip */}
          <AnimatePresence>
            {state.alert && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="anim-alert"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(255,23,68,0.16)',
                  border: '1px solid rgba(255,23,68,0.6)',
                }}
              >
                <span className="font-hud text-red" style={{ fontSize: 9, letterSpacing: '0.18em' }}>⚡ ALERT</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Connect HW button */}
          <button
            onClick={() => setShowConnect(true)}
            className="btn-hud"
            style={{
              width: 'auto',
              padding: '7px 14px',
              fontSize: 9,
              borderRadius: 8,
              background: hwConnected ? 'rgba(0,255,136,0.08)' : 'rgba(0,229,255,0.06)',
              borderColor: hwConnected ? 'rgba(0,255,136,0.4)' : 'rgba(0,229,255,0.25)',
              color: hwConnected ? 'var(--green)' : 'var(--cyan)',
            }}
          >
            <PlugZap size={11} />
            {hwConnected ? `${state.connectionMode.toUpperCase()} ●` : 'CONNECT HW'}
          </button>

          {/* Connection pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div className={state.connected ? 'led led-green anim-pulse' : 'led led-red'} />
            <span className="font-mono" style={{
              fontSize: 10, letterSpacing: '0.1em',
              color: state.connected ? 'var(--green)' : 'var(--red)',
            }}>
              {state.connected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <LiveClock />
        </div>
      </header>

      {/* ═══════════════════════════════════
          BODY — 3 column grid
      ═══════════════════════════════════ */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '200px 1fr 256px',
        gap: 10,
        position: 'relative',
        zIndex: 10,
      }}>

        {/* ══ LEFT — Telemetry ══ */}
        <LiveDataPanel />

        {/* ══ CENTER — Radar + Bottom ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Radar panel */}
          <div
            className={`panel scanlines ${isArmed ? 'armed-panel' : ''}`}
            style={{
              flex: 1, minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Radar header */}
            <div className="panel-header" style={{
              borderBottom: `1px solid ${isArmed ? 'rgba(255,23,68,0.2)' : 'var(--border)'}`,
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="panel-dot" style={{ background: isArmed ? 'var(--red)' : 'var(--cyan)', boxShadow: `0 0 8px ${isArmed ? 'var(--red)' : 'var(--cyan)'}` }} />
                <span className="panel-header-label">RADAR DISPLAY</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
                  AZ: {state.currentAngle}° &nbsp;|&nbsp; {state.currentDistance}cm
                </span>
                <div className="led led-green anim-pulse" />
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>SCANNING</span>
              </div>
            </div>

            {/* Radar canvas */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <RadarDisplay />
            </div>
          </div>

          {/* Bottom tab panel */}
          <div className="panel" style={{ height: 196, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="tab-bar" style={{ flexShrink: 0 }}>
              {([
                { key: 'graph', label: 'DETECTION HISTORY', icon: BarChart2 },
                { key: 'log',   label: 'EVENT LOG',         icon: List },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setBottomTab(key)}
                  className={`tab-btn ${bottomTab === key ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                >
                  <Icon size={10} />
                  {label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: '10px 14px', overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                {bottomTab === 'graph'
                  ? <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}><DetectionGraph compact /></motion.div>
                  : <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}><EventLog compact /></motion.div>
                }
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — Controls ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Controls card */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0 }}>
            {/* Tab bar */}
            <div className="tab-bar" style={{ flexShrink: 0 }}>
              <button className={`tab-btn ${rightTab === 'controls' ? 'active' : ''}`} onClick={() => setRightTab('controls')}>CONTROLS</button>
              <button className={`tab-btn ${rightTab === 'status' ? 'active' : ''}`} onClick={() => setRightTab('status')}>STATUS</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence mode="wait">
                {rightTab === 'controls' ? (
                  <motion.div key="ctrl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ArmControl />
                    <GateControl />
                  </motion.div>
                ) : (
                  <motion.div key="stat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <SystemStatus />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Alert / sound card */}
          <div style={{ flexShrink: 0 }}>
            <AlertSystem />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SystemProvider>
      <Dashboard />
    </SystemProvider>
  );
}
