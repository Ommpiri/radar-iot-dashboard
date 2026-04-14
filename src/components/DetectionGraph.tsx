import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useSystem } from '../context/SystemContext';

const fmt = (time: number) =>
  new Date(time).toLocaleTimeString('en-US', { hour12: false, second: '2-digit', minute: '2-digit' });

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(2,4,9,0.95)',
      border: '1px solid rgba(0,229,255,0.25)',
      borderRadius: 8, padding: '6px 10px',
    }}>
      <div className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>
        {fmt(payload[0]?.payload?.time)}
      </div>
      <div className="data-value" style={{ fontSize: 15, color: 'var(--cyan)' }}>
        {payload[0]?.value}<span style={{ fontSize: 10, marginLeft: 2, opacity: 0.6 }}>cm</span>
      </div>
    </div>
  );
};

export default function DetectionGraph({ compact = false }: { compact?: boolean }) {
  const { state } = useSystem();
  const data = state.detectionHistory.slice(-80);

  const chart = (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--cyan)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--red)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.04)" vertical={false} />
        <XAxis dataKey="time" hide />
        <YAxis
          domain={[0, 45]} tick={{ fontSize: 8, fill: 'rgba(100,160,200,0.4)', fontFamily: 'Share Tech Mono' }}
          tickLine={false} axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={20} stroke="rgba(255,23,68,0.4)" strokeDasharray="4 4" strokeWidth={1} />
        <Area
          type="monotone" dataKey="distance"
          stroke="var(--cyan)" strokeWidth={1.5}
          fill="url(#distGrad)"
          dot={false} isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (compact) return chart;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: 220 }}>
      <div className="panel-header">
        <div className="panel-dot" style={{ background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
        <span className="panel-header-label">DETECTION HISTORY</span>
        <span className="data-label" style={{ marginLeft: 'auto', fontSize: 8 }}>DIST (cm)</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '8px 8px 4px' }}>
        {chart}
      </div>
    </div>
  );
}
