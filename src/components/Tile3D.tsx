"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

function Cube({ color, emoji, hovered }: { color: string; emoji: string; hovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetY = hovered ? -0.15 : 0;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 8);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, hovered ? 0.3 : 0, delta * 6);
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[2.8, 1.8, 0.5]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

export default function Tile3D({ emoji, title, desc, color }: { emoji: string; title: string; desc: string; color: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="sap-tile-3d"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="sap-tile-3d-canvas">
        <Canvas
          camera={{ position: [0, 0, 4], fov: 40 }}
          shadows
          style={{ pointerEvents: "none" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-2, 3, -2]} intensity={0.3} />
          <Cube color={color} emoji={emoji} hovered={hovered} />
        </Canvas>
      </div>
      <div className="sap-tile-3d-emoji">{emoji}</div>
      <div className="sap-tile-3d-text">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
}