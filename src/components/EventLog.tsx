import React from 'react';
import { motion } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import { Shield, ShieldOff, DoorOpen, DoorClosed, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

const iconMap: Record<string, any> = {
  ARM: Shield, DISARM: ShieldOff, GATE_OPEN: DoorOpen, GATE_CLOSE: DoorClosed,
  DETECTION: AlertTriangle, CONNECT: Wifi, DISCONNECT: WifiOff, ALERT: AlertTriangle,
};
const colorMap: Record<string, string> = {
  ARM: 'var(--red)', DISARM: 'var(--cyan)', GATE_OPEN: 'var(--green)',
  GATE_CLOSE: 'var(--orange)', DETECTION: 'var(--orange)', CONNECT: 'var(--green)',
  DISCONNECT: 'rgba(255,255,255,0.3)', ALERT: 'var(--red)',
};

function ago(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return `${Math.floor(d / 1000)}s`;
  return `${Math.floor(d / 60000)}m`;
}

export default function EventLog({ compact = false }: { compact?: boolean }) {
  const { state } = useSystem();

  const rows = (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
      {state.eventLog.length === 0 && (
        <div className="data-label" style={{ textAlign: 'center', padding: '20px 0', opacity: 0.35 }}>
          No events recorded
        </div>
      )}
      {state.eventLog.map((entry, i) => {
        const Icon = iconMap[entry.type] || AlertTriangle;
        const color = colorMap[entry.type] || 'rgba(255,255,255,0.4)';
        return (
          <motion.div key={entry.id}
            initial={i === 0 ? { opacity: 0, x: -12 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '5px 6px', borderRadius: 6,
              cursor: 'default',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <Icon size={11} style={{ color, flexShrink: 0, marginTop: 1 }} />
            <span className="font-mono" style={{
              flex: 1, fontSize: 10, lineHeight: 1.45,
              color: 'rgba(180,210,230,0.75)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.message}
            </span>
            <span className="data-label" style={{ fontSize: 8, flexShrink: 0, marginTop: 1 }}>
              {ago(entry.timestamp)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );

  if (compact) return rows;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div className="panel-dot" style={{ background: 'var(--purple)', boxShadow: '0 0 8px var(--purple)' }} />
        <span className="panel-header-label">EVENT LOG</span>
        <span className="data-label" style={{ marginLeft: 'auto', fontSize: 8 }}>{state.eventLog.length}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '8px 10px', overflow: 'hidden' }}>
        {rows}
      </div>
    </div>
  );
}
