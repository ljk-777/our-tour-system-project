import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Line, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { GLOBE_MARKERS, GLOBE_ROUTES } from '@/data/globeData';

const latLngToVector3 = (lat, lng, radius) => {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  );
};

const Earth = ({ radius = 5 }) => {
  const earthRef = useRef(null);
  const [colorMap, normalMap, specularMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
  ]);

  useFrame(() => {
    if (earthRef.current) earthRef.current.rotation.y += 0.0004;
  });

  return (
    <group ref={earthRef}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshPhongMaterial map={colorMap} normalMap={normalMap} specularMap={specularMap}
          specular={new THREE.Color('grey')} shininess={50} />
      </mesh>
      {/* 大气光晕 */}
      <mesh>
        <sphereGeometry args={[radius * 1.05, 64, 64]} />
        <meshPhongMaterial color="#3b82f6" transparent opacity={0.12}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
      {GLOBE_MARKERS.map(m => <Marker key={m.id} marker={m} radius={radius} />)}
      {GLOBE_ROUTES.map(r => <RoutePath key={r.id} route={r} radius={radius} />)}
    </group>
  );
};

const Marker = ({ marker, radius }) => {
  const { setSelectedMarker } = useAppStore();
  const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, radius), [marker, radius]);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={e => { e.stopPropagation(); setSelectedMarker(marker); }}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={hovered ? '#fbbf24' : '#f97316'} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#f97316" transparent opacity={hovered ? 0.5 : 0.2}
          blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

const RoutePath = ({ route, radius }) => {
  const curve = useMemo(() => {
    const pts = route.points.map(p => latLngToVector3(p.lat, p.lng, radius));
    if (pts.length < 2) return null;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const mid = pts[i].clone().lerp(pts[i+1], 0.5).normalize().multiplyScalar(radius * 1.25);
      out.push(...new THREE.QuadraticBezierCurve3(pts[i], mid, pts[i+1]).getPoints(30));
    }
    return out;
  }, [route, radius]);

  if (!curve) return null;
  return <Line points={curve} color={route.color} lineWidth={1.5} transparent opacity={0.7} />;
};

const CameraController = () => (
  <OrbitControls enablePan={false} enableZoom minDistance={6} maxDistance={22}
    rotateSpeed={0.4} zoomSpeed={0.7} autoRotate={false} />
);

export const EarthScene = () => (
  <>
    <color attach="background" args={['#040e24']} />
    <ambientLight intensity={1.2} />
    <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
    <pointLight position={[-10, -10, -10]} intensity={0.8} color="#3b82f6" />
    <Stars radius={120} depth={50} count={4000} factor={3} saturation={0.1} fade speed={0.5} />
    <Earth radius={5} />
    <CameraController />
  </>
);
