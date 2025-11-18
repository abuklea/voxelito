import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function Viewer() {
  return (
    <Canvas style={{ height: '100%' }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="grey" />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
}
