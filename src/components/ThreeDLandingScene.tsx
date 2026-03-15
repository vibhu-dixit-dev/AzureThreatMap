"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Line, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

// Random points generation for nodes
const generateNodes = (count = 50, radius = 10) => {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = radius * Math.cbrt(Math.random());
    
    // Convert polar to cartesian
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    // Pick a random team color (red for attacker, blue for defender, green for healthy)
    const colors = ["#ff3366", "#00d2ff", "#10b981", "#6366f1"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    nodes.push({ position: new THREE.Vector3(x, y, z), color });
  }
  return nodes;
};

// Generate connections (edges) between close nodes to form a graph
const generateEdges = (nodes: any[], maxDistance = 4) => {
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].position.distanceTo(nodes[j].position) < maxDistance) {
        // Randomly make some edges "active" attack paths (red/glowing)
        const isAttackPath = Math.random() > 0.85;
        edges.push({
          start: nodes[i].position,
          end: nodes[j].position,
          isAttackPath
        });
      }
    }
  }
  return edges;
};

const ThreatGraph = ({ isTransitioning }: { isTransitioning: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Memoize geometry to avoid recalculating every render
  const nodes = useMemo(() => generateNodes(80, 12), []);
  const edges = useMemo(() => generateEdges(nodes, 5), [nodes]);

  // Rotate the whole graph
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.rotation.x += delta * 0.02;
    }
    
    // If transitioning, we could speed up rotation or expand nodes
    if (isTransitioning && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
      groupRef.current.scale.lerp(new THREE.Vector3(2, 2, 2), 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {edges.map((edge, i) => (
        <Line 
          key={`edge-${i}`}
          points={[edge.start, edge.end]}
          color={edge.isAttackPath ? "#ff3366" : "#2a3b5c"}
          lineWidth={edge.isAttackPath ? 1.5 : 0.5}
          transparent
          opacity={edge.isAttackPath ? 0.8 : 0.3}
        />
      ))}
      
      {/* Nodes */}
      {nodes.map((node, i) => (
        <mesh key={`node-${i}`} position={node.position}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color={node.color} />
          {/* Subtle glow effect using a larger transparent sphere */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.2} depthWrite={false} />
          </mesh>
        </mesh>
      ))}
    </group>
  );
};

// Camera animation component
const CameraController = ({ isTransitioning }: { isTransitioning: boolean }) => {
  useFrame((state) => {
    if (isTransitioning) {
      // Zoom into the center slowly
      state.camera.position.lerp(new THREE.Vector3(0, 0, 2), 0.03);
      state.camera.lookAt(0, 0, 0);
    } else {
      // Gentle floating motion when resting
      state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.1) * 2;
      state.camera.position.y = Math.cos(state.clock.elapsedTime * 0.1) * 2;
      state.camera.lookAt(0, 0, 0);
    }
  });
  return null;
};

interface ThreeDLandingSceneProps {
  isTransitioning: boolean;
}

export default function ThreeDLandingScene({ isTransitioning }: ThreeDLandingSceneProps) {
  return (
    <div className="absolute inset-0 z-0 bg-[#020617] pointer-events-none">
      <Canvas camera={{ position: [0, 0, 25], fov: 45 }}>
        <color attach="background" args={['#020617']} />
        
        {/* Ambient lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00d2ff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#10b981" />
        
        <ThreatGraph isTransitioning={isTransitioning} />
        <CameraController isTransitioning={isTransitioning} />
        
        {/* Adds fog for depth effect */}
        <fog attach="fog" args={['#020617', 15, 35]} />
      </Canvas>
    </div>
  );
}
