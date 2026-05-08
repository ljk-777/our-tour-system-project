import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
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

/* ── 地球主体 ────────────────────────────────────────────── */
const Earth = ({ radius = 5 }) => {
  const groupRef = useRef(null);
  const cloudRef = useRef(null);

  /* 高清纹理：NASA Blue Marble */
  const [colorMap, normalMap, specularMap, cloudsMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png',
  ]);

  useFrame(() => {
    if (groupRef.current)  groupRef.current.rotation.y  += 0.0003;
    if (cloudRef.current)  cloudRef.current.rotation.y  += 0.00045; // 云层稍快
  });

  return (
    <group ref={groupRef}>
      {/* 地球本体 — PBR 物理材质 */}
      <mesh>
        <sphereGeometry args={[radius, 80, 80]} />
        <meshStandardMaterial
          map={colorMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughnessMap={specularMap}
          roughness={0.78}
          metalness={0.08}
        />
      </mesh>

      {/* 云层 */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[radius * 1.008, 80, 80]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 大气散射光晕 */}
      <mesh>
        <sphereGeometry args={[radius * 1.04, 64, 64]} />
        <meshStandardMaterial
          color="#4fc3f7"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 地标 */}
      {GLOBE_MARKERS.map(m => <Marker key={m.id} marker={m} radius={radius} />)}
      {/* 航路 */}
      {GLOBE_ROUTES.map(r => <RoutePath key={r.id} route={r} radius={radius} />)}
    </group>
  );
};

/* ── 地标点（橙色主题）────────────────────────────────────── */
const Marker = ({ marker, radius }) => {
  const { setSelectedMarker } = useAppStore();
  const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, radius), [marker, radius]);
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef(null);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2.5) * 0.35;
      pulseRef.current.scale.setScalar(s);
      pulseRef.current.material.opacity = hovered ? 0.55 - Math.sin(clock.elapsedTime * 2.5) * 0.2 : 0;
    }
  });

  return (
    <group position={position}>
      {/* 主点 */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={e => { e.stopPropagation(); setSelectedMarker(marker); }}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={hovered ? '#fbbf24' : '#f97316'} />
      </mesh>
      {/* 脉冲光环 */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 常驻光晕 */}
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#f97316" transparent opacity={hovered ? 0.5 : 0.18}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

/* ── 航线弧 ──────────────────────────────────────────────── */
const RoutePath = ({ route, radius }) => {
  const curve = useMemo(() => {
    const pts = route.points.map(p => latLngToVector3(p.lat, p.lng, radius));
    if (pts.length < 2) return null;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const mid = pts[i].clone().lerp(pts[i+1], 0.5).normalize().multiplyScalar(radius * 1.3);
      out.push(...new THREE.QuadraticBezierCurve3(pts[i], mid, pts[i+1]).getPoints(40));
    }
    return out;
  }, [route, radius]);

  if (!curve) return null;
  return <Line points={curve} color={route.color} lineWidth={1.2} transparent opacity={0.65} />;
};

/* ── 轨道控制器 ──────────────────────────────────────────── */
const CameraController = () => (
  <OrbitControls
    enablePan={false}
    enableZoom
    minDistance={6.5}
    maxDistance={24}
    rotateSpeed={0.35}
    zoomSpeed={0.6}
    autoRotate={false}
    enableDamping
    dampingFactor={0.06}
  />
);

/* ── 场景根节点 ──────────────────────────────────────────── */
export const EarthScene = () => (
  <>
    <color attach="background" args={['#030914']} />

    {/* 均衡打光：保留高光质感但不产生死黑暗面 */}
    <ambientLight intensity={0.9} />
    <directionalLight position={[12, 4, 8]} intensity={1.8} color="#fff8e7" />
    <directionalLight position={[-10, -3, -8]} intensity={0.6} color="#c8d8ff" />

    <Stars radius={130} depth={60} count={5000} factor={3.5} saturation={0.08} fade speed={0.4} />
    <Earth radius={5} />
    <CameraController />
  </>
);
