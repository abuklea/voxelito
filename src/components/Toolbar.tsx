import React from 'react';
import { useVoxelStore } from '../store/voxelStore';
import type { SelectionTool, SelectionMode } from '../store/voxelStore';

const tools: { id: SelectionTool; label: string }[] = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'box', label: 'Box' },
  { id: 'sphere', label: 'Sphere' },
];

const modes: { id: SelectionMode; label: string }[] = [
  { id: 'replace', label: 'Replace' },
  { id: 'add', label: 'Add (+Shift)' },
  { id: 'subtract', label: 'Sub (+Alt)' },
];

export const Toolbar: React.FC = () => {
  const {
    selectionTool,
    setSelectionTool,
    selectionMode,
    setSelectionMode,
    brushSize,
    setBrushSize,
    clearSelection,
  } = useVoxelStore();

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      backgroundColor: 'rgba(30, 30, 40, 0.9)',
      padding: '15px',
      borderRadius: '8px',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      backdropFilter: 'blur(5px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      width: '200px',
      zIndex: 100
    }}>
      <div>
        <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>TOOL</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectionTool(t.id)}
              style={{
                flex: 1,
                padding: '5px',
                backgroundColor: selectionTool === t.id ? '#7c3aed' : '#333',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>MODE</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectionMode(m.id)}
              style={{
                flex: 1,
                padding: '5px',
                backgroundColor: selectionMode === m.id ? '#7c3aed' : '#333',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {(selectionTool === 'sphere' || selectionTool === 'cursor') && (
        <div>
           <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>BRUSH SIZE: {brushSize}</div>
           <input
             type="range"
             min="1"
             max="10"
             step="0.5"
             value={brushSize}
             onChange={(e) => setBrushSize(parseFloat(e.target.value))}
             style={{ width: '100%' }}
           />
        </div>
      )}

      <button
        onClick={clearSelection}
        style={{
          padding: '8px',
          backgroundColor: '#dc2626',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          marginTop: '5px'
        }}
      >
        Clear Selection
      </button>
    </div>
  );
};
