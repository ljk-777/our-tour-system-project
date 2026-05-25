import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Line, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { GLOBE_MARKERS, GLOBE_ROUTES } from '@/data/globeData';

/* ── 旅行者彩色地标 ────────────────────────────────────── */
const TravelerDots = ({ traveler, radius = 5 }) => {
  const dotsRef = useRef([]);
  useFrame(({ clock }) => {
    dotsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const s = 1 + Math.sin(clock.elapsedTime * 2.8 + i * 1.2) * 0.35;
      mesh.scale.setScalar(s);
      mesh.material.opacity = 0.35 + Math.sin(clock.elapsedTime * 2.8 + i) * 0.2;
    });
  });
  if (!traveler) return null;
  return traveler.spots.map((spot, i) => {
    const pos = latLngToVector3(spot.lat, spot.lng, radius * 1.015);
    return (
      <group key={i} position={pos}>
        <mesh>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color={traveler.color} />
        </mesh>
        <mesh ref={el => dotsRef.current[i] = el}>
          <sphereGeometry args={[0.10, 10, 10]} />
          <meshBasicMaterial color={traveler.color} transparent opacity={0.35}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    );
  });
};

/* ── AI 路线动画（飞机 + 拖尾）──────────────────────────── */
const TRAIL_LEN = 55;

const AiRouteAnimation = ({ from, to, radius = 5, playing, onDone }) => {
  const planeRef = useRef(null);
  const tRef     = useRef(0);
  const trailPos = useRef([]);
  const upVec    = useRef(new THREE.Vector3(0, 1, 0));

  const { curve, points } = useMemo(() => {
    if (!from || !to) return { curve: null, points: [] };
    const a   = latLngToVector3(from.lat, from.lng, radius);
    const b   = latLngToVector3(to.lat,   to.lng,   radius);
    const mid = a.clone().lerp(b, 0.5).normalize().multiplyScalar(radius * 1.62);
    const c   = new THREE.QuadraticBezierCurve3(a, mid, b);
    return { curve: c, points: c.getPoints(90) };
  }, [from, to, radius]);

  /* 拖尾几何体（BufferGeometry，每帧更新顶点色和位置）*/
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  const trailMat  = useMemo(() => new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const trailLine = useMemo(() => new THREE.Line(trailGeo, trailMat), [trailGeo, trailMat]);

  /* 换路线时重置 */
  useEffect(() => {
    tRef.current = 0;
    trailPos.current = [];
    trailGeo.setDrawRange(0, 0);
  }, [from, to, trailGeo]);

  useFrame((_, delta) => {
    if (!playing || !curve || !planeRef.current) return;
    tRef.current = Math.min(tRef.current + delta * 0.18, 1);
    const p = curve.getPoint(tRef.current);
    planeRef.current.position.copy(p);

    /* 飞机朝向：+Y=前进方向, +X=右翼, +Z=机背朝外（远离地心）*/
    if (tRef.current < 0.99) {
      const tangent   = curve.getTangent(tRef.current).normalize();
      const surfaceUp = p.clone().normalize();
      const right     = new THREE.Vector3().crossVectors(tangent, surfaceUp).normalize();
      const localZ    = new THREE.Vector3().crossVectors(right, tangent).normalize();
      planeRef.current.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(right, tangent, localZ)
      );
    }

    /* 更新拖尾位置和颜色 */
    trailPos.current.unshift(p.clone());
    if (trailPos.current.length > TRAIL_LEN) trailPos.current.pop();

    const posAttr = trailGeo.getAttribute('position');
    const colAttr = trailGeo.getAttribute('color');
    trailPos.current.forEach((pt, i) => {
      const t = Math.pow(1 - i / TRAIL_LEN, 1.4);
      posAttr.setXYZ(i, pt.x, pt.y, pt.z);
      colAttr.setXYZ(i, t * 0.98, t * 0.55, t * 0.08); // 橙→暗（加法混合=渐隐）
    });
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    trailGeo.setDrawRange(0, trailPos.current.length);

    if (tRef.current >= 1 && onDone) {
      tRef.current = 0;
      trailPos.current = [];
      trailGeo.setDrawRange(0, 0);
      onDone();
    }
  });

  if (!curve || !from || !to) return null;
  return (
    <group>
      {/* 淡显参考弧线 */}
      <Line points={points} color="#f97316" lineWidth={1.0} transparent opacity={0.15} />
      {/* 动态拖尾 */}
      <primitive object={trailLine} />
      {/* ── 飞机主体（+Y = 机头朝前）── */}
      <group ref={planeRef}>
        {/* 机身 */}
        <mesh>
          <cylinderGeometry args={[0.022, 0.018, 0.26, 10]} />
          <meshStandardMaterial color="#f4f6ff" roughness={0.25} metalness={0.55} />
        </mesh>
        {/* 机头半球 */}
        <mesh position={[0, 0.148, 0]}>
          <sphereGeometry args={[0.022, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#eef0ff" roughness={0.2} metalness={0.5} />
        </mesh>
        {/* 主机翼（薄平板，沿 X 轴展开）*/}
        <mesh position={[0, 0.025, 0]}>
          <boxGeometry args={[0.30, 0.006, 0.052]} />
          <meshStandardMaterial color="#e8ecff" roughness={0.35} metalness={0.45} />
        </mesh>
        {/* 翼梢小翼 */}
        <mesh position={[0.148, 0.038, -0.008]}>
          <boxGeometry args={[0.005, 0.028, 0.022]} />
          <meshStandardMaterial color="#dce2ff" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[-0.148, 0.038, -0.008]}>
          <boxGeometry args={[0.005, 0.028, 0.022]} />
          <meshStandardMaterial color="#dce2ff" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* 水平尾翼 */}
        <mesh position={[0, -0.112, 0]}>
          <boxGeometry args={[0.15, 0.005, 0.032]} />
          <meshStandardMaterial color="#e8ecff" roughness={0.35} metalness={0.45} />
        </mesh>
        {/* 垂直尾翼 */}
        <mesh position={[0, -0.085, -0.020]}>
          <boxGeometry args={[0.005, 0.072, 0.044]} />
          <meshStandardMaterial color="#f0f2ff" roughness={0.25} metalness={0.5} />
        </mesh>
        {/* 左发动机 */}
        <mesh position={[-0.090, 0.005, 0.016]}>
          <cylinderGeometry args={[0.013, 0.010, 0.065, 8]} />
          <meshStandardMaterial color="#b0b8c8" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* 右发动机 */}
        <mesh position={[0.090, 0.005, 0.016]}>
          <cylinderGeometry args={[0.013, 0.010, 0.065, 8]} />
          <meshStandardMaterial color="#b0b8c8" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* 发动机尾焰 */}
        <mesh position={[-0.090, -0.040, 0.016]}>
          <sphereGeometry args={[0.014, 6, 6]} />
          <meshBasicMaterial color="#ff7800" transparent opacity={0.75}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh position={[0.090, -0.040, 0.016]}>
          <sphereGeometry args={[0.014, 6, 6]} />
          <meshBasicMaterial color="#ff7800" transparent opacity={0.75}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* 整机光晕 */}
        <mesh>
          <sphereGeometry args={[0.13, 10, 10]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.18}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};

/* ── 坐标转换 ─────────────────────────────────────────────── */
const latLngToVector3 = (lat, lng, radius) => {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  );
};


/* ── 银河背景（程序化，5 万颗星分布在银河盘面）─────────────── */
const Galaxy = () => {
  const geo = useMemo(() => {
    const COUNT = 50000;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const isBand = Math.random() < 0.65;
      let x, y, z;

      if (isBand) {
        // 银河盘面：扁平椭圆分布
        const r = 60 + Math.random() * 180;
        const a = Math.random() * Math.PI * 2;
        const tilt = (Math.random() - 0.5) * 0.18;
        x = r * Math.cos(a);
        y = r * Math.sin(tilt) * 12;
        z = r * Math.sin(a);
      } else {
        // 球形散布背景星
        const r = 120 + Math.random() * 130;
        const u = Math.random(), v = Math.random();
        const phi   = Math.acos(2 * u - 1);
        const theta = 2 * Math.PI * v;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.cos(phi);
        z = r * Math.sin(phi) * Math.sin(theta);
      }

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 星色：蓝白 / 白 / 暖黄（模拟不同恒星型）
      const t = Math.random();
      if (t < 0.55) {
        colors[i * 3] = 0.75 + Math.random() * 0.25;
        colors[i * 3 + 1] = 0.82 + Math.random() * 0.18;
        colors[i * 3 + 2] = 1.0;
      } else if (t < 0.82) {
        const w = 0.88 + Math.random() * 0.12;
        colors[i * 3] = w; colors[i * 3 + 1] = w; colors[i * 3 + 2] = w;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.78 + Math.random() * 0.18;
        colors[i * 3 + 2] = 0.45 + Math.random() * 0.3;
      }

      sizes[i] = Math.random() < 0.02 ? 1.8 + Math.random() * 1.5 : 0.3 + Math.random() * 0.6;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    g.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
    return g;
  }, []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (280.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 xy = gl_PointCoord - vec2(0.5);
        float r = dot(xy, xy);
        if (r > 0.25) discard;
        float alpha = 1.0 - smoothstep(0.1, 0.25, r);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  return <points geometry={geo} material={mat} />;
};

/* ── 地球主体 ────────────────────────────────────────────── */
const Earth = ({ radius = 5 }) => {
  const groupRef = useRef(null);
  const cloudRef = useRef(null);

  const selectedTraveler = useAppStore(s => s.selectedTraveler);
  const aiRoute          = useAppStore(s => s.aiRoute);
  const aiPlaying        = useAppStore(s => s.aiPlaying);
  const setAiPlaying     = useAppStore(s => s.setAiPlaying);
  const searchMarker     = useAppStore(s => s.searchMarker);
  const searchMode       = useAppStore(s => s.searchMode);

  const [colorMap, normalMap, specularMap, cloudsMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png',
  ]);


  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.0003;
    if (cloudRef.current) cloudRef.current.rotation.y += 0.00046;
  });

  return (
    <group ref={groupRef}>
      {/* 地球本体 — PBR */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[radius, 96, 96]} />
        <meshStandardMaterial
          map={colorMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.9, 0.9)}
          roughnessMap={specularMap}
          roughness={0.72}
          metalness={0.06}
        />
      </mesh>

      {/* 云层 */}
      <mesh ref={cloudRef} renderOrder={2}>
        <sphereGeometry args={[radius * 1.007, 80, 80]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>



      {/* 搜索模式：只显示搜索结果地标；旅行者模式：显示足迹；默认：全部地标 */}
      {!selectedTraveler && !searchMode && GLOBE_MARKERS.map(m => <Marker key={m.id} marker={m} radius={radius} />)}
      {!searchMode && GLOBE_ROUTES.map(r => <RoutePath key={r.id} route={r} radius={radius} />)}
      {searchMode && searchMarker && <SearchResultMarker marker={searchMarker} radius={radius} />}

      {/* 旅行者足迹点 & AI航线 — 在旋转组内，随地球一起转 */}
      <TravelerDots traveler={selectedTraveler} radius={radius} />
      {aiRoute && (
        <AiRouteAnimation
          from={aiRoute.from} to={aiRoute.to} radius={radius}
          playing={aiPlaying}
          onDone={() => setAiPlaying(false)}
        />
      )}
    </group>
  );
};

/* ── 地标点（脉冲动画）───────────────────────────────────── */
const Marker = ({ marker, radius }) => {
  const { setSelectedMarker } = useAppStore();
  const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, radius), [marker, radius]);
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef(null);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = clock.elapsedTime;
      const s = 1 + Math.sin(t * 2.2) * 0.4;
      pulseRef.current.scale.setScalar(s);
      pulseRef.current.material.opacity = hovered
        ? 0.55 - Math.sin(t * 2.2) * 0.2
        : 0.22 - Math.sin(t * 2.2) * 0.08;
    }
  });

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={e => { e.stopPropagation(); setSelectedMarker(marker); }}
      >
        <sphereGeometry args={[0.038, 10, 10]} />
        <meshBasicMaterial color={hovered ? '#fde68a' : '#f97316'} />
      </mesh>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.28}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

/* ── 搜索结果地标（大脉冲，蓝白色）────────────────────────── */
const SearchResultMarker = ({ marker, radius }) => {
  const { setSelectedMarker } = useAppStore();
  const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, radius), [marker, radius]);
  const ring1 = useRef(null);
  const ring2 = useRef(null);
  const ring3 = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring1.current) {
      const s = 1 + ((t * 1.2) % 1) * 2.5;
      ring1.current.scale.setScalar(s);
      ring1.current.material.opacity = Math.max(0, 0.7 - ((t * 1.2) % 1) * 0.7);
    }
    if (ring2.current) {
      const s2 = 1 + ((t * 1.2 + 0.33) % 1) * 2.5;
      ring2.current.scale.setScalar(s2);
      ring2.current.material.opacity = Math.max(0, 0.7 - ((t * 1.2 + 0.33) % 1) * 0.7);
    }
    if (ring3.current) {
      const s3 = 1 + ((t * 1.2 + 0.66) % 1) * 2.5;
      ring3.current.scale.setScalar(s3);
      ring3.current.material.opacity = Math.max(0, 0.7 - ((t * 1.2 + 0.66) % 1) * 0.7);
    }
  });

  return (
    <group position={position}>
      {/* 核心亮点 */}
      <mesh onClick={e => { e.stopPropagation(); setSelectedMarker(marker); }}>
        <sphereGeometry args={[0.06, 14, 14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* 橙色光晕核 */}
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.9}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 三个错相脉冲环 */}
      <mesh ref={ring1}>
        <sphereGeometry args={[0.10, 12, 12]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.7}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ring2}>
        <sphereGeometry args={[0.10, 12, 12]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.5}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ring3}>
        <sphereGeometry args={[0.10, 12, 12]} />
        <meshBasicMaterial color="#fff7ed" transparent opacity={0.35}
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
      const mid = pts[i].clone().lerp(pts[i+1], 0.5).normalize().multiplyScalar(radius * 1.32);
      out.push(...new THREE.QuadraticBezierCurve3(pts[i], mid, pts[i+1]).getPoints(50));
    }
    return out;
  }, [route, radius]);

  if (!curve) return null;
  return <Line points={curve} color={route.color} lineWidth={1.2} transparent opacity={route.opacity ?? 0.4} />;
};

/* ── 轨道控制器 ──────────────────────────────────────────── */
const CameraController = () => (
  <OrbitControls
    enablePan={false} enableZoom
    minDistance={6.5} maxDistance={28}
    rotateSpeed={0.3} zoomSpeed={0.55}
    enableDamping dampingFactor={0.05}
  />
);

/* ── 场景根节点 ──────────────────────────────────────────── */
export { TravelerDots, AiRouteAnimation, latLngToVector3 };

export const EarthScene = () => (
  <>
    <color attach="background" args={['#00010a']} />

    <ambientLight intensity={0.85} />
    <directionalLight position={[14, 5, 9]} intensity={2.2} color="#fff9f0" />
    <directionalLight position={[-12, -4, -8]} intensity={0.5} color="#c8d8ff" />

    {/* 程序化银河 */}
    <Galaxy />

    {/* 地球 */}
    <Earth radius={5} />

    {/* 轨道控制 */}
    <CameraController />
  </>
);
