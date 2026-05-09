import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EarthScene, TravelerDots, AiRouteAnimation } from '../components/Earth3D.jsx';
import GlobeOverlay from '../components/GlobeOverlay.jsx';
import { useAppStore } from '@/store/useAppStore';

function LoadingScreen() {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#00010a', color: 'rgba(255,255,255,0.55)',
      fontFamily: 'Inter, sans-serif', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '2px solid rgba(249,115,22,0.2)',
        borderTopColor: '#f97316',
        animation: 'spin 0.9s linear infinite',
      }} />
      <span style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>加载地球纹理中...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* Canvas 内部组件，访问 store */
function SceneExtras() {
  const selectedTraveler = useAppStore(s => s.selectedTraveler);
  const aiRoute   = useAppStore(s => s.aiRoute);
  const aiPlaying = useAppStore(s => s.aiPlaying);
  const setAiPlaying = useAppStore(s => s.setAiPlaying);

  return (
    <>
      <TravelerDots traveler={selectedTraveler} radius={5} />
      {aiRoute && (
        <AiRouteAnimation
          from={aiRoute.from} to={aiRoute.to} radius={5}
          playing={aiPlaying}
          onDone={() => setAiPlaying(false)}
        />
      )}
    </>
  );
}

export default function Globe() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#00010a' }}>

      {/* 3D 画布 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
          <Suspense fallback={null}>
            <EarthScene />
            <SceneExtras />
          </Suspense>
        </Canvas>
      </div>

      {/* UI 叠加层 */}
      <Suspense fallback={<LoadingScreen />}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <GlobeOverlay />
        </div>
      </Suspense>
    </div>
  );
}
