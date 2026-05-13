import { Canvas } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';

function FloatingNodes({ count = 50 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
      speeds[i] = 0.2 + Math.random() * 0.6;
    }
    return { positions, speeds };
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!mesh.current) return;
    const { positions, speeds } = data;
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1] + Math.sin(Date.now() * 0.001 * speeds[i]) * 0.5,
        positions[i * 3 + 2],
      );
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color="#7c3aed" transparent opacity={0.4} />
    </instancedMesh>
  );
}

function Connections() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  const lines = useMemo(() => {
    return Array.from({ length: 15 }, () => {
      const startX = (Math.random() - 0.5) * 10;
      const startY = (Math.random() - 0.5) * 6;
      const endX = startX + (Math.random() - 0.5) * 3;
      const endY = startY + (Math.random() - 0.5) * 2;
      return {
        points: [new THREE.Vector3(startX, startY, -1), new THREE.Vector3(endX, endY, 1)] as [THREE.Vector3, THREE.Vector3],
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {lines.map((line, i) => (
        <Line key={i} points={line.points} color="#4c1d95" lineWidth={0.5} transparent opacity={0.12} />
      ))}
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.2} />
      <FloatingNodes count={50} />
      <Connections />
    </Canvas>
  );
}
