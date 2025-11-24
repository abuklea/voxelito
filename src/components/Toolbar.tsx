import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
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
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    if (voxelWorld) {
        voxelWorld.setAutoRotate(autoRotate);
    }
  }, [autoRotate, voxelWorld]);

  useEffect(() => {
    if (voxelWorld) {
      voxelWorld.setGridVisibility(showGrid);
    }
  }, [showGrid, voxelWorld]);

  const handleResetView = () => {
    if (voxelWorld) {
        // Smooth transition
        const startPos = voxelWorld.camera.position.clone();
        const targetPos = new THREE.Vector3(50, 50, 50);
        const startTarget = voxelWorld.controls.target.clone();
        const endTarget = new THREE.Vector3(0, 0, 0);

        const duration = 1000;
        const startTime = performance.now();

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - t, 3);

            voxelWorld.camera.position.lerpVectors(startPos, targetPos, ease);
            voxelWorld.controls.target.lerpVectors(startTarget, endTarget, ease);
            voxelWorld.controls.update();
            voxelWorld.requestRender();

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
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
    <div
      className="toolbar-container"
      style={{
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
            <button
                onClick={() => setShowGrid(!showGrid)}
                style={showGrid ? activeButtonStyle : buttonStyle}
            >
                {showGrid ? 'Hide Grid' : 'Show Grid'}
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
