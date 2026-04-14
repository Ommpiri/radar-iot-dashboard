import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import {
  Usb, Wifi, X, ChevronRight, AlertCircle, CheckCircle2,
  Loader2, PlugZap, Unplug
} from 'lucide-react';

type Tab = 'serial' | 'websocket';
type ConnState = 'idle' | 'connecting' | 'connected' | 'error';

interface Props {
  onClose: () => void;
}

async function openSerialPort(
  baudRate: number,
  onData: (line: string) => void,
  onDisconnect: () => void
): Promise<{ port: any; disconnect: () => void; writer: WritableStreamDefaultWriter }> {
  const serial = (navigator as any).serial;
  if (!serial) throw new Error('Web Serial API not supported in this browser. Use Chrome or Edge.');

  const port = await serial.requestPort();
  await port.open({ baudRate });

  let active = true;
  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
  let buffer = '';

  (async () => {
    const decoder = new TextDecoder();
    try {
      while (active) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(l => l.trim() && onData(l.trim()));
      }
    } catch {
      // port closed
    } finally {
      onDisconnect();
    }
  })();

  const disconnect = async () => {
    active = false;
    try { await reader.cancel(); } catch {}
    try { await writer.close(); } catch {}
    try { await port.close(); } catch {}
    onDisconnect();
  };

  return { port, disconnect, writer };
}

export default function ConnectionModal({ onClose }: Props) {
  const { state, dispatch, setWebSocketRef, serialWriterRef } = useSystem();

  const [tab, setTab] = useState<Tab>('serial');
  const [connState, setConnState] = useState<ConnState>('idle');
  const [error, setError] = useState('');
  const [wsUrl, setWsUrl] = useState('ws://192.168.1.100:81');
  const [baudRate, setBaudRate] = useState(9600);
  const wsRef = useRef<WebSocket | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  const isConnected = state.connected && state.connectionMode !== 'demo';

  // ── Parse incoming data line ─────────────────────────────────────────
  const parseLine = useCallback((line: string) => {
    const parts = line.trim().split(',');
    if (parts.length >= 2) {
      const angle = parseFloat(parts[0]);
      const distance = parseFloat(parts[1]);
      if (!isNaN(angle) && !isNaN(distance)) {
        dispatch({ type: 'UPDATE_RADAR', payload: { angle: Math.round(angle), distance: Math.round(distance) } });
      }
    }
  }, [dispatch]);

  // ── Serial connect ───────────────────────────────────────────────────
  const connectSerial = async () => {
    setError('');
    setConnState('connecting');
    try {
      dispatch({ type: 'STOP_DEMO' });
      const { disconnect, writer } = await openSerialPort(baudRate, parseLine, () => {
        setConnState('idle');
        if (serialWriterRef) serialWriterRef.current = null;
        dispatch({ type: 'SET_CONNECTED', payload: false });
        dispatch({ type: 'SET_CONNECTION_MODE', payload: 'demo' });
        dispatch({ type: 'START_DEMO' });
      });
      disconnectRef.current = disconnect;
      if (serialWriterRef) serialWriterRef.current = writer;
      dispatch({ type: 'SET_CONNECTION_MODE', payload: 'serial' });
      dispatch({ type: 'SET_CONNECTED', payload: true });
      setConnState('connected');
    } catch (e: any) {
      setError(e.message || 'Failed to connect to serial port.');
      setConnState('error');
      dispatch({ type: 'START_DEMO' });
    }
  };


  // ── WebSocket connect ────────────────────────────────────────────────
  const connectWebSocket = () => {
    setError('');
    setConnState('connecting');
    dispatch({ type: 'STOP_DEMO' });

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      if (setWebSocketRef) setWebSocketRef(ws);

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setError('Connection timed out. Check the IP and port.');
          setConnState('error');
          dispatch({ type: 'START_DEMO' });
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        dispatch({ type: 'SET_CONNECTION_MODE', payload: 'websocket' });
        dispatch({ type: 'SET_CONNECTED', payload: true });
        setConnState('connected');
      };

      ws.onmessage = (e) => parseLine(e.data);

      ws.onerror = () => {
        clearTimeout(timeout);
        setError('WebSocket error. Check that the ESP32 is online.');
        setConnState('error');
        dispatch({ type: 'START_DEMO' });
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (connState === 'connected') {
          dispatch({ type: 'SET_CONNECTED', payload: false });
          dispatch({ type: 'SET_CONNECTION_MODE', payload: 'demo' });
          dispatch({ type: 'START_DEMO' });
          setConnState('idle');
        }
      };

      disconnectRef.current = () => ws.close();
    } catch (e: any) {
      setError(e.message || 'Invalid WebSocket URL.');
      setConnState('error');
      dispatch({ type: 'START_DEMO' });
    }
  };

  // ── Disconnect ───────────────────────────────────────────────────────
  const disconnect = () => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    wsRef.current = null;
    dispatch({ type: 'SET_CONNECTED', payload: false });
    dispatch({ type: 'SET_CONNECTION_MODE', payload: 'demo' });
    dispatch({ type: 'START_DEMO' });
    setConnState('idle');
    setError('');
  };

  const handleConnect = () => {
    if (tab === 'serial') connectSerial();
    else connectWebSocket();
  };

  // ── Status indicator ─────────────────────────────────────────────────
  const StatusBadge = () => {
    if (connState === 'connecting') return (
      <div className="flex items-center gap-2" style={{ color: 'var(--neon-cyan)' }}>
        <Loader2 size={14} className="animate-spin" />
        <span className="font-mono-tech text-xs">CONNECTING…</span>
      </div>
    );
    if (connState === 'connected') return (
      <div className="flex items-center gap-2" style={{ color: 'var(--neon-green)' }}>
        <CheckCircle2 size={14} />
        <span className="font-mono-tech text-xs">CONNECTED — {state.connectionMode.toUpperCase()}</span>
      </div>
    );
    if (connState === 'error') return (
      <div className="flex items-center gap-2" style={{ color: 'var(--neon-red)' }}>
        <AlertCircle size={14} />
        <span className="font-mono-tech text-xs">ERROR</span>
      </div>
    );
    return null;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="glass rounded-2xl hud-border w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ border: '1px solid rgba(0,245,255,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <PlugZap size={18} style={{ color: 'var(--neon-cyan)' }} />
            <span className="font-orbitron text-sm font-bold tracking-widest" style={{ color: 'var(--neon-cyan)' }}>
              HARDWARE CONNECTION
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Connection type tabs */}
          <div className="glass rounded-xl p-1 flex gap-1">
            {[
              { key: 'serial', label: 'USB / SERIAL', icon: Usb, desc: 'Arduino via USB' },
              { key: 'websocket', label: 'WEBSOCKET', icon: Wifi, desc: 'ESP32 via WiFi' },
            ].map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => { setTab(key as Tab); setError(''); setConnState('idle'); }}
                disabled={connState === 'connected'}
                className="flex-1 flex flex-col items-center gap-1 py-3 rounded-lg transition-all"
                style={{
                  background: tab === key ? 'rgba(0,245,255,0.1)' : 'transparent',
                  border: `1px solid ${tab === key ? 'rgba(0,245,255,0.3)' : 'transparent'}`,
                  color: tab === key ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.35)',
                }}
              >
                <Icon size={16} />
                <span className="font-orbitron text-xs tracking-wider">{label}</span>
                <span className="font-mono-tech opacity-50" style={{ fontSize: 10 }}>{desc}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {tab === 'serial' ? (
              <motion.div
                key="serial"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4"
              >
                <div className="glass rounded-xl p-4 flex flex-col gap-3">
                  <div className="font-orbitron text-xs tracking-widest opacity-50">BAUD RATE</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[9600, 57600, 115200].map(rate => (
                      <button
                        key={rate}
                        onClick={() => setBaudRate(rate)}
                        disabled={connState === 'connected'}
                        className="py-2 rounded-lg font-mono-tech text-xs transition-all"
                        style={{
                          background: baudRate === rate ? 'rgba(0,245,255,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${baudRate === rate ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          color: baudRate === rate ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {rate.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data format info */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.08)' }}>
                  <div className="font-mono-tech opacity-40 mb-2" style={{ fontSize: 10 }}>EXPECTED DATA FORMAT (Arduino → PC)</div>
                  <code className="font-mono-tech text-xs" style={{ color: 'var(--neon-green)' }}>
                    Serial.println(angle + "," + distance);
                  </code>
                  <div className="font-mono-tech opacity-30 mt-2" style={{ fontSize: 10 }}>Example: <span style={{ color: 'var(--neon-cyan)' }}>90,25</span></div>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.08)' }}>
                  <div className="font-mono-tech opacity-40 mb-2" style={{ fontSize: 10 }}>COMMANDS YOU CAN SEND TO ARDUINO</div>
                  {['ARM', 'DISARM', 'GATE_OPEN', 'GATE_CLOSE'].map(cmd => (
                    <div key={cmd} className="font-mono-tech text-xs" style={{ color: 'var(--neon-cyan)', marginBottom: 2 }}>{cmd}</div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="websocket"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <label className="font-orbitron text-xs tracking-widest opacity-50">ESP32 WEBSOCKET URL</label>
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={e => setWsUrl(e.target.value)}
                    disabled={connState === 'connected'}
                    placeholder="ws://192.168.1.100:81"
                    className="w-full px-4 py-3 rounded-xl font-mono-tech text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(0,245,255,0.2)',
                      color: 'var(--neon-cyan)',
                      caretColor: 'var(--neon-cyan)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.2)'}
                  />
                  <div className="font-mono-tech opacity-30" style={{ fontSize: 10 }}>
                    Default ESP32 WebSocket port is usually 80 or 81
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.08)' }}>
                  <div className="font-mono-tech opacity-40 mb-2" style={{ fontSize: 10 }}>ESP32 ARDUINO CODE (WebSocketServer)</div>
                  <code className="font-mono-tech" style={{ color: 'var(--neon-green)', fontSize: 10, lineHeight: 1.6 }}>
                    {`#include <WebSocketsServer.h>\nWebSocketsServer ws(81);\nvoid sendData(int angle, int dist) {\n  ws.broadcastTXT(String(angle)+","+dist);\n}`}
                  </code>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,0,64,0.08)', border: '1px solid rgba(255,0,64,0.25)' }}
              >
                <AlertCircle size={14} style={{ color: 'var(--neon-red)', flexShrink: 0, marginTop: 1 }} />
                <span className="font-mono-tech text-xs leading-relaxed" style={{ color: 'rgba(255,160,160,0.9)' }}>
                  {error}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge />
            <div className="font-mono-tech opacity-25" style={{ fontSize: 10 }}>
              {connState === 'idle' && !isConnected ? 'Demo mode active' : ''}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {connState === 'connected' ? (
              <button
                onClick={disconnect}
                className="btn-neon flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-orbitron text-xs font-bold tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(255,0,64,0.1)',
                  border: '1px solid rgba(255,0,64,0.35)',
                  color: 'var(--neon-red)',
                }}
              >
                <Unplug size={14} /> DISCONNECT
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connState === 'connecting'}
                className="btn-neon flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-orbitron text-xs font-bold tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,245,255,0.12), rgba(0,180,200,0.05))',
                  border: '1px solid rgba(0,245,255,0.35)',
                  color: 'var(--neon-cyan)',
                  boxShadow: '0 0 20px rgba(0,245,255,0.15)',
                }}
              >
                {connState === 'connecting'
                  ? <><Loader2 size={14} className="animate-spin" /> CONNECTING…</>
                  : <><ChevronRight size={14} /> CONNECT {tab === 'serial' ? 'VIA USB' : 'VIA WIFI'}</>
                }
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
