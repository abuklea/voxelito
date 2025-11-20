import React, { forwardRef } from 'react';

export const Viewer = forwardRef<HTMLDivElement>((props, ref) => {
  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
});
