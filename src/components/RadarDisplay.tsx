import React, { useEffect, useRef, useCallback } from 'react';
import { useSystem } from '../context/SystemContext';

const RADAR_RANGE_CM = 40;

export default function RadarDisplay() {
  const { state } = useSystem();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx, cy) - 10;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // --- Background ---
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bgGrad.addColorStop(0, 'rgba(0, 20, 10, 0.95)');
    bgGrad.addColorStop(0.7, 'rgba(0, 10, 5, 0.98)');
    bgGrad.addColorStop(1, 'rgba(0, 5, 2, 1)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // --- Range rings ---
    const rings = 4;
    for (let i = 1; i <= rings; i++) {
      const r = (R / rings) * i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 80, ${0.08 + (i === rings ? 0.06 : 0)})`;
      ctx.lineWidth = i === rings ? 1.5 : 1;
      ctx.stroke();

      // Range label
      const rangeCm = Math.round((RADAR_RANGE_CM / rings) * i);
      ctx.fillStyle = 'rgba(0, 255, 80, 0.35)';
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.fillText(`${rangeCm}cm`, cx + r + 3, cy - 3);
    }

    // --- Degree lines (semicircle: 0°–180°) ---
    for (let deg = 0; deg <= 180; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const x2 = cx + R * Math.cos(Math.PI - rad);
      const y2 = cy - R * Math.sin(rad) + R; // flip to bottom half

      // Actually let's do the standard radar from bottom center
      // 0° left, 90° top, 180° right
      const rad2 = ((180 - deg) * Math.PI) / 180;
      const x2b = cx + R * Math.cos(rad2);
      const y2b = cy - R * Math.sin(rad2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2b, y2b);
      ctx.strokeStyle = `rgba(0, 255, 80, ${deg % 90 === 0 ? 0.2 : 0.08})`;
      ctx.lineWidth = deg % 90 === 0 ? 1 : 0.5;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Degree marker
      const lx = cx + (R + 18) * Math.cos(rad2);
      const ly = cy - (R + 18) * Math.sin(rad2);
      ctx.fillStyle = 'rgba(0, 255, 100, 0.55)';
      ctx.font = 'bold 10px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${deg}°`, lx, ly);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Semicircle clip (top half only for 180° radar)
    // Actually we'll show full circle but plot in upper half

    // Sweep trail via arc segments
    const sweepRad = ((180 - state.scannerAngle) * Math.PI) / 180;
    const trailLength = Math.PI / 2.5;


    // Manual trail sweep arc
    for (let t = 0; t < 60; t++) {
      const alpha = ((60 - t) / 60) * 0.25;
      const trailRad = sweepRad - (t / 60) * trailLength;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R - 2, trailRad, trailRad + (trailLength / 60));
      ctx.lineTo(cx, cy);
      ctx.fillStyle = `rgba(0, 255, 80, ${alpha})`;
      ctx.fill();
    }

    // --- Main sweep line ---
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(sweepRad), cy - R * Math.sin(sweepRad));
    ctx.strokeStyle = '#00ff55';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff55';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- Radar points (fading trail) ---
    const now = Date.now();
    state.radarPoints.forEach(point => {
      const age = now - point.timestamp;
      const maxAge = 3500;
      if (age > maxAge) return;

      const alpha = Math.max(0, 1 - age / maxAge);
      const distFrac = Math.min(point.distance / RADAR_RANGE_CM, 1);
      const plotR = distFrac * (R - 8);
      const plotRad = ((180 - point.angle) * Math.PI) / 180;
      const px = cx + plotR * Math.cos(plotRad);
      const py = cy - plotR * Math.sin(plotRad);

      const color =
        point.status === 'danger' ? `rgba(255, 0, 60, ${alpha})`
        : point.status === 'warning' ? `rgba(255, 140, 0, ${alpha})`
        : `rgba(0, 255, 120, ${alpha})`;

      const glowColor =
        point.status === 'danger' ? '255, 0, 60'
        : point.status === 'warning' ? '255, 140, 0'
        : '0, 255, 120';

      // Outer glow ring
      if (alpha > 0.5) {
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${glowColor}, ${alpha * 0.15})`;
        ctx.fill();
      }

      // Main dot
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = alpha > 0.7 ? 10 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // --- Center dot ---
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // outer ring border
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = state.armed
      ? 'rgba(255, 0, 64, 0.5)'
      : 'rgba(0, 255, 100, 0.25)';
    ctx.lineWidth = 2;
    ctx.shadowColor = state.armed ? '#ff0040' : '#00ff64';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    animFrameRef.current = requestAnimationFrame(draw);
  }, [state.radarPoints, state.scannerAngle, state.armed]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const size = Math.min(container.clientWidth, container.clientHeight);
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
      />
      <div className="font-mono" style={{ position: 'absolute', top: 8, left: 16, fontSize: 10, color: 'rgba(0,255,100,0.5)', letterSpacing: '0.15em' }}>RADAR.SYS</div>
      <div className="font-mono" style={{ position: 'absolute', top: 8, right: 16, fontSize: 10, color: 'rgba(0,255,100,0.5)' }}>RANGE: 40cm</div>
    </div>
  );
}
