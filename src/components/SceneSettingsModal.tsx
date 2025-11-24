import React, { useState, useEffect } from 'react';
import { useVoxelStore } from '../store/voxelStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SceneSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { sceneSize, setSceneSize } = useVoxelStore();
  const [dims, setDims] = useState({ x: sceneSize[0], y: sceneSize[1], z: sceneSize[2] });

  useEffect(() => {
    if (isOpen) {
        setDims({ x: sceneSize[0], y: sceneSize[1], z: sceneSize[2] });
    }
  }, [isOpen, sceneSize]);

  const handleSave = () => {
    setSceneSize([Number(dims.x), Number(dims.y), Number(dims.z)]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
       <div style={{
          backgroundColor: '#1a1a24',
          border: '2px solid #7c3aed',
          borderRadius: '8px',
          padding: '20px',
          width: '300px',
          boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)',
          color: 'white'
       }} onClick={e => e.stopPropagation()}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#a78bfa' }}>Scene Dimensions</h3>

          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Width (X):</label>
                <input
                    type="number"
                    value={dims.x}
                    onChange={e => setDims({...dims, x: parseInt(e.target.value) || 0})}
                    style={inputStyle}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Height (Y):</label>
                <input
                    type="number"
                    value={dims.y}
                    onChange={e => setDims({...dims, y: parseInt(e.target.value) || 0})}
                    style={inputStyle}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Depth (Z):</label>
                <input
                    type="number"
                    value={dims.z}
                    onChange={e => setDims({...dims, z: parseInt(e.target.value) || 0})}
                    style={inputStyle}
                />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={onClose} style={cancelButtonStyle}>Cancel</button>
              <button onClick={handleSave} style={saveButtonStyle}>Apply</button>
          </div>
       </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
    backgroundColor: '#333',
    border: '1px solid #555',
    color: 'white',
    padding: '5px',
    borderRadius: '4px',
    width: '80px'
};

const saveButtonStyle: React.CSSProperties = {
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
};

const cancelButtonStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: '#aaa',
    border: '1px solid #555',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
};
