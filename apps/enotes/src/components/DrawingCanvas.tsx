import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  onSave?: (dataUrl: string) => void;
}

export default function DrawingCanvas({ width = 600, height = 400, onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#333333');
  const [lineWidth, setLineWidth] = useState(2);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getCtx = () => canvasRef.current?.getContext('2d');

  useEffect(() => {
    const ctx = getCtx();
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
  }, [width, height]);

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent) => {
    setDrawing(true);
    lastPoint.current = getPos(e);
  };

  const draw = (e: React.MouseEvent) => {
    if (!drawing || !lastPoint.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 5 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPoint.current = pos;
  };

  const stopDraw = () => {
    setDrawing(false);
    lastPoint.current = null;
  };

  const clear = () => {
    const ctx = getCtx();
    if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
  };

  const save = () => {
    if (canvasRef.current && onSave) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const colors = ['#333333', '#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#795548'];

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
        <button onClick={() => setTool('pen')} style={{ padding: '4px 8px', background: tool === 'pen' ? '#667eea' : '#fff', color: tool === 'pen' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✏️ Pen</button>
        <button onClick={() => setTool('eraser')} style={{ padding: '4px 8px', background: tool === 'eraser' ? '#667eea' : '#fff', color: tool === 'eraser' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🧹 Eraser</button>
        <span style={{ width: 1, height: 20, background: '#ddd' }} />
        {colors.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool('pen'); }}
            style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #333' : '1px solid #ccc', cursor: 'pointer', padding: 0 }} />
        ))}
        <span style={{ width: 1, height: 20, background: '#ddd' }} />
        <label style={{ fontSize: 12 }}>Size: <input type="range" min={1} max={10} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} style={{ width: 60, verticalAlign: 'middle' }} /></label>
        <div style={{ flex: 1 }} />
        <button onClick={clear} style={{ padding: '4px 8px', background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Clear</button>
        <button onClick={save} style={{ padding: '4px 8px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Save</button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        style={{ cursor: tool === 'eraser' ? 'crosshair' : 'crosshair', display: 'block' }}
      />
    </div>
  );
}
