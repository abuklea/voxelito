import React, { forwardRef } from 'react';

/**
 * A container component for the Three.js canvas.
 * It forwards a ref to the underlying div so the VoxelWorld can attach the renderer.
 *
 * @param props - React props (none currently).
 * @param ref - Reference to the HTMLDivElement.
 */
export const Viewer = forwardRef<HTMLDivElement>((props, ref) => {
  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
});
