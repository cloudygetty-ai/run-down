import { useEffect, useState } from 'react';
import { MapScreen } from './screens/MapScreen';
import { SpotsScreen } from './screens/SpotsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { BottomNav } from './components/HUD/BottomNav';
import { TopBar } from './components/HUD/TopBar';
import { startMockService } from './services/mock.service';
import type { NavTab } from './types';

export function App() {
  const [tab, setTab] = useState<NavTab>('map');

  useEffect(() => {
    const stop = startMockService();
    return stop;
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Top bar persists across all tabs */}
      {tab !== 'map' && <TopBar />}

      {/* Screens — map stays mounted to preserve map state */}
      <div style={{ display: tab === 'map' ? 'block' : 'none', position: 'absolute', inset: 0 }}>
        <MapScreen />
      </div>
      {tab === 'spots' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <SpotsScreen />
        </div>
      )}
      {tab === 'profile' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <ProfileScreen />
        </div>
      )}

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
