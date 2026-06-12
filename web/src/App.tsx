import { useEffect, useState } from 'react';
import { MapScreen } from './screens/MapScreen';
import { NearbyScreen } from './screens/NearbyScreen';
import { ChatsScreen } from './screens/ChatsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TopBar } from './components/HUD/TopBar';
import { BottomNav } from './components/HUD/BottomNav';
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
      {/* TopBar only on non-map tabs (map has its own) */}
      {tab !== 'map' && <TopBar />}

      {/* Map stays mounted */}
      <div style={{ display: tab === 'map' ? 'block' : 'none', position: 'absolute', inset: 0 }}>
        <MapScreen />
      </div>
      {tab === 'nearby'  && <NearbyScreen />}
      {tab === 'chats'   && <ChatsScreen />}
      {tab === 'profile' && <ProfileScreen />}

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
