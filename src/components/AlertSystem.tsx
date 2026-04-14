import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import { AlertTriangle, Bell, BellOff, X } from 'lucide-react';

interface Notif { id: string; msg: string; ts: number; }

export default function AlertSystem() {
  const { state, dispatch } = useSystem();
  const prevAlert = useRef(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const buzzerRef = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  // Buzzer
  useEffect(() => {
    if (state.alert && state.soundEnabled && state.armed) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtx.current = ctx;
      const buzz = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
      };
      buzz();
      buzzerRef.current = window.setInterval(buzz, 850);
    } else {
      if (buzzerRef.current) { clearInterval(buzzerRef.current); buzzerRef.current = null; }
      audioCtx.current?.close(); audioCtx.current = null;
    }
    return () => { if (buzzerRef.current) clearInterval(buzzerRef.current); };
  }, [state.alert, state.soundEnabled, state.armed]);

  // Toast popup
  useEffect(() => {
    if (state.alert && !prevAlert.current) {
      const n: Notif = {
        id: Math.random().toString(36).slice(2),
        msg: `Object at ${state.currentDistance}cm — ${state.currentAngle}°`,
        ts: Date.now(),
      };
      setNotifs(p => [n, ...p].slice(0, 4));
    }
    prevAlert.current = state.alert;
  }, [state.alert]);

  useEffect(() => {
    const t = setInterval(() => setNotifs(p => p.filter(n => Date.now() - n.ts < 5000)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* Alert banner */}
      <AnimatePresence>
        {state.alert ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            style={{
              background: 'rgba(40,4,10,0.9)',
              border: '1px solid rgba(255,23,68,0.5)',
              borderRadius: 12,
              padding: '10px 14px',
              boxShadow: '0 0 24px rgba(255,23,68,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.55, repeat: Infinity }}
              >
                <AlertTriangle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
              </motion.div>
              <div style={{ flex: 1 }}>
                <div className="font-hud text-red" style={{ fontSize: 10, letterSpacing: '0.18em' }}>INTRUSION DETECTED</div>
                <div className="data-label" style={{ fontSize: 9, marginTop: 2 }}>
                  Dist: {state.currentDistance}cm · Angle: {state.currentAngle}°
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                {state.soundEnabled
                  ? <Bell size={14} style={{ color: 'var(--red)' }} />
                  : <BellOff size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                }
              </button>
            </div>
            {/* Flash bar */}
            <motion.div
              style={{ height: 1.5, borderRadius: 2, background: 'var(--red)', marginTop: 8 }}
              animate={{ scaleX: [0, 1, 0.7, 1], opacity: [0.4, 1, 0.6, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          </motion.div>
        ) : (
          /* Sound toggle — idle state */
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '8px 12px',
          }}>
            <span className="data-label" style={{ fontSize: 9 }}>SOUND ALERT</span>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: state.soundEnabled ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${state.soundEnabled ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: state.soundEnabled ? 'var(--cyan)' : 'rgba(255,255,255,0.3)',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
              }}
            >
              {state.soundEnabled ? <Bell size={11} /> : <BellOff size={11} />}
              {state.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20,
        zIndex: 60, display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {notifs.map(n => (
            <motion.div key={n.id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 320, damping: 28 }}
              style={{
                background: 'rgba(30,4,8,0.95)',
                border: '1px solid rgba(255,23,68,0.45)',
                borderRadius: 10, padding: '8px 12px',
                boxShadow: '0 0 18px rgba(255,23,68,0.25)',
                display: 'flex', alignItems: 'center', gap: 8,
                maxWidth: 280, pointerEvents: 'auto',
              }}
            >
              <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,200,200,0.9)', flex: 1 }}>
                {n.msg}
              </span>
              <button
                onClick={() => setNotifs(p => p.filter(x => x.id !== n.id))}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
