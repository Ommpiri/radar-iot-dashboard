import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';

export interface RadarPoint {
  id: string;
  angle: number;
  distance: number;
  timestamp: number;
  status: 'safe' | 'warning' | 'danger';
}

export interface EventLogEntry {
  id: string;
  timestamp: number;
  type: 'ARM' | 'DISARM' | 'GATE_OPEN' | 'GATE_CLOSE' | 'DETECTION' | 'CONNECT' | 'DISCONNECT' | 'ALERT';
  message: string;
}

export interface DetectionSample {
  time: number;
  distance: number;
  angle: number;
}

export interface SystemState {
  armed: boolean;
  gateOpen: boolean;
  connected: boolean;
  connectionMode: 'serial' | 'websocket' | 'demo';
  latency: number;
  currentAngle: number;
  currentDistance: number;
  scannerAngle: number;
  alert: boolean;
  soundEnabled: boolean;
  radarPoints: RadarPoint[];
  eventLog: EventLogEntry[];
  detectionHistory: DetectionSample[];
  sensorHealth: { ultrasonic: boolean; servo: boolean; controller: boolean };
  lastUpdate: number;
  demoActive: boolean;
  terrain: 'LAND' | 'WATER' | 'AIR' | null; // ← ESP32 environment indicator
}

type Action =
  | { type: 'TOGGLE_ARM' }
  | { type: 'TOGGLE_GATE' }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONNECTION_MODE'; payload: SystemState['connectionMode'] }
  | { type: 'UPDATE_RADAR'; payload: { angle: number; distance: number } }
  | { type: 'SET_ALERT'; payload: boolean }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'ADD_LOG'; payload: Omit<EventLogEntry, 'id' | 'timestamp'> }
  | { type: 'SET_SCANNER_ANGLE'; payload: number }
  | { type: 'SET_TERRAIN'; payload: SystemState['terrain'] } // ← ESP32 LAND/WATER/AIR
  | { type: 'START_DEMO' }
  | { type: 'STOP_DEMO' };

const initialState: SystemState = {
  armed: false,
  gateOpen: false,
  connected: false,
  connectionMode: 'websocket',   // default to websocket mode
  latency: 0,
  currentAngle: 90,
  currentDistance: 0,
  scannerAngle: 0,
  alert: false,
  soundEnabled: true,
  radarPoints: [],
  eventLog: [],
  detectionHistory: [],
  sensorHealth: { ultrasonic: true, servo: true, controller: true },
  lastUpdate: Date.now(),
  demoActive: false,             // ← demo OFF by default
  terrain: null,
};

function addLog(state: SystemState, entry: Omit<EventLogEntry, 'id' | 'timestamp'>): EventLogEntry[] {
  const newEntry: EventLogEntry = {
    ...entry,
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
  };
  return [newEntry, ...state.eventLog].slice(0, 100);
}

function reducer(state: SystemState, action: Action): SystemState {
  switch (action.type) {
    case 'TOGGLE_ARM': {
      const armed = !state.armed;
      return {
        ...state,
        armed,
        alert: armed ? state.alert : false,
        eventLog: addLog(state, {
          type: armed ? 'ARM' : 'DISARM',
          message: armed ? '⚠ System ARMED — Active monitoring engaged' : '✓ System DISARMED — Monitoring passive',
        }),
      };
    }
    case 'TOGGLE_GATE': {
      const gateOpen = !state.gateOpen;
      return {
        ...state,
        gateOpen,
        eventLog: addLog(state, {
          type: gateOpen ? 'GATE_OPEN' : 'GATE_CLOSE',
          message: gateOpen ? 'Gate opened — Access granted' : 'Gate closed — Access denied',
        }),
      };
    }
    case 'SET_CONNECTED':
      return {
        ...state,
        connected: action.payload,
        eventLog: addLog(state, {
          type: action.payload ? 'CONNECT' : 'DISCONNECT',
          message: action.payload ? `Hardware connected via ${state.connectionMode}` : 'Hardware disconnected — reverting to demo',
        }),
      };
    case 'SET_CONNECTION_MODE':
      return { ...state, connectionMode: action.payload };
    case 'UPDATE_RADAR': {
      const { angle, distance } = action.payload;
      const status: RadarPoint['status'] = distance < 15 ? 'danger' : distance < 25 ? 'warning' : 'safe';
      const newPoint: RadarPoint = {
        id: `${angle}-${Date.now()}`,
        angle,
        distance,
        timestamp: Date.now(),
        status,
      };
      const filteredPoints = state.radarPoints
        .filter(p => Date.now() - p.timestamp < 3500)
        .slice(-60);
      const newHistory: DetectionSample = { time: Date.now(), distance, angle };
      const historySlice = [...state.detectionHistory, newHistory].slice(-120);
      const shouldAlert = state.armed && distance < 20;
      const newLog = shouldAlert && !state.alert
        ? addLog(state, { type: 'ALERT', message: `⚡ INTRUDER ALERT — Object at ${distance}cm, angle ${angle}°` })
        : state.eventLog;
      return {
        ...state,
        currentAngle: angle,
        currentDistance: distance,
        scannerAngle: angle,
        radarPoints: [...filteredPoints, newPoint],
        detectionHistory: historySlice,
        alert: shouldAlert,
        lastUpdate: Date.now(),
        eventLog: newLog,
      };
    }
    case 'SET_ALERT':
      return { ...state, alert: action.payload };
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'SET_LATENCY':
      return { ...state, latency: action.payload };
    case 'ADD_LOG':
      return { ...state, eventLog: addLog(state, action.payload) };
    case 'SET_SCANNER_ANGLE':
      return { ...state, scannerAngle: action.payload };
    case 'SET_TERRAIN':
      return {
        ...state,
        terrain: action.payload,
        eventLog: addLog(state, {
          type: 'DETECTION',
          message: `◈ Terrain mode → ${action.payload ?? 'UNKNOWN'}`,
        }),
      };
    case 'START_DEMO':
      return { ...state, demoActive: true };
    case 'STOP_DEMO':
      return { ...state, demoActive: false, radarPoints: [] };
    default:
      return state;
  }
}

interface SystemContextValue {
  state: SystemState;
  dispatch: React.Dispatch<Action>;
  sendCommand: (cmd: string) => void;
  setWebSocketRef: (ws: WebSocket) => void;
  serialWriterRef: React.MutableRefObject<WritableStreamDefaultWriter | null>;
}

const SystemContext = createContext<SystemContextValue | null>(null);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const serialWriterRef = useRef<WritableStreamDefaultWriter | null>(null);
  const demoIntervalRef = useRef<number | null>(null);

  // Demo simulation — starts/stops based on state.demoActive
  useEffect(() => {
    if (!state.demoActive) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      return;
    }

    // Start demo
    dispatch({ type: 'SET_CONNECTION_MODE', payload: 'demo' });
    dispatch({ type: 'SET_CONNECTED', payload: true });

    let sweepAngle = 0;
    let sweepDir = 1;
    let tick = 0;

    demoIntervalRef.current = window.setInterval(() => {
      tick++;
      sweepAngle += sweepDir * 3;
      if (sweepAngle >= 180) { sweepAngle = 180; sweepDir = -1; }
      if (sweepAngle <= 0) { sweepAngle = 0; sweepDir = 1; }

      let distance = 30 + Math.sin(sweepAngle * 0.08) * 15 + Math.random() * 8;
      if (tick % 90 > 70 && tick % 90 < 85) {
        distance = 10 + Math.random() * 8;
      }
      distance = Math.max(5, Math.min(40, distance));

      const latency = 8 + Math.floor(Math.random() * 18);
      dispatch({ type: 'SET_LATENCY', payload: latency });
      dispatch({ type: 'UPDATE_RADAR', payload: { angle: Math.round(sweepAngle), distance: Math.round(distance) } });
    }, 80);

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
    };
  }, [state.demoActive]);

  const setWebSocketRef = useCallback((ws: WebSocket) => {
    wsRef.current = ws;
  }, []);

  const sendCommand = useCallback(async (cmd: string) => {
    if (state.connectionMode === 'websocket' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd);
    } else if (state.connectionMode === 'serial' && serialWriterRef.current) {
      try {
        const encoder = new TextEncoder();
        await serialWriterRef.current.write(encoder.encode(cmd + '\n'));
      } catch (e) {
        console.error('[SERIAL CMD]', e);
      }
    }
    console.log('[CMD →]', cmd);
  }, [state.connectionMode]);

  return (
    <SystemContext.Provider value={{ state, dispatch, sendCommand, setWebSocketRef, serialWriterRef }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error('useSystem must be used within SystemProvider');
  return ctx;
}
