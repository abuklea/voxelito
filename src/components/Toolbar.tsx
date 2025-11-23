import React, { useEffect, useState } from 'react';
import { useVoxelStore } from '../store/voxelStore';
import type { SelectionTool, SelectionMode } from '../store/voxelStore';
import type { VoxelWorld } from '../lib/VoxelWorld';

interface ToolbarProps {
  voxelWorld: VoxelWorld | null;
}

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

export const Toolbar: React.FC<ToolbarProps> = ({ voxelWorld }) => {
  const {
    selectionTool,
    setSelectionTool,
    selectionMode,
    setSelectionMode,
    brushSize,
    setBrushSize,
    clearSelection,
  } = useVoxelStore();

  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    if (voxelWorld) {
        voxelWorld.setAutoRotate(autoRotate);
    }
  }, [autoRotate, voxelWorld]);

  const handleResetView = () => {
    if (voxelWorld) {
        // Isometric-ish view
        voxelWorld.camera.position.set(50, 50, 50);
        // Look at origin
        voxelWorld.controls.target.set(0, 0, 0);
        voxelWorld.controls.update();
        voxelWorld.requestRender();
    }
  };

  const buttonStyle = {
    flex: 1,
    padding: '5px',
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#7c3aed'
  };

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
        <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>CAMERA</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button
                onClick={handleResetView}
                style={buttonStyle}
            >
                Reset View
            </button>
            <button
                onClick={() => setAutoRotate(!autoRotate)}
                style={autoRotate ? activeButtonStyle : buttonStyle}
            >
                {autoRotate ? 'Stop Rotate' : 'Auto Rotate'}
            </button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>TOOL</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectionTool(t.id)}
              style={selectionTool === t.id ? activeButtonStyle : buttonStyle}
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
              style={selectionMode === m.id ? activeButtonStyle : buttonStyle}
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
          ...buttonStyle,
          backgroundColor: '#dc2626',
          marginTop: '5px'
        }}
      >
        Clear Selection
      </button>
    </div>
  );
};
